from __future__ import annotations
import math
from datetime import date
import QuantLib as ql

from models import (
    BondRequest, BondResponse, CashflowItem,
    ZeroCouponBondRequest, ZeroCouponBondResponse,
    SwapRequest, SwapResponse,
    TIPSRequest, TIPSResponse,
    BootstrapRequest, BootstrapResponse,
    CurveFitRequest, CurveFitResponse, CurvePoint,
    Frequency, DayCount, CurveInterpolation, CurveFitMethod,
)

_STANDARD_TENORS = [
    ('3M',  0.25,  ql.Period(3,  ql.Months)),
    ('6M',  0.5,   ql.Period(6,  ql.Months)),
    ('1Y',  1.0,   ql.Period(1,  ql.Years)),
    ('2Y',  2.0,   ql.Period(2,  ql.Years)),
    ('3Y',  3.0,   ql.Period(3,  ql.Years)),
    ('5Y',  5.0,   ql.Period(5,  ql.Years)),
    ('7Y',  7.0,   ql.Period(7,  ql.Years)),
    ('10Y', 10.0,  ql.Period(10, ql.Years)),
    ('15Y', 15.0,  ql.Period(15, ql.Years)),
    ('20Y', 20.0,  ql.Period(20, ql.Years)),
    ('30Y', 30.0,  ql.Period(30, ql.Years)),
]


def _ql_date(d: date) -> ql.Date:
    return ql.Date(d.day, d.month, d.year)


def _ql_frequency(f: Frequency) -> ql.Frequency:
    return {
        Frequency.annual:     ql.Annual,
        Frequency.semiannual: ql.Semiannual,
        Frequency.quarterly:  ql.Quarterly,
        Frequency.monthly:    ql.Monthly,
    }[f]


def _ql_period(f: Frequency) -> ql.Period:
    return {
        Frequency.annual:     ql.Period(12, ql.Months),
        Frequency.semiannual: ql.Period(6,  ql.Months),
        Frequency.quarterly:  ql.Period(3,  ql.Months),
        Frequency.monthly:    ql.Period(1,  ql.Months),
    }[f]


def _ql_dc(dc: DayCount) -> ql.DayCounter:
    return {
        DayCount.act365:    ql.Actual365Fixed(),
        DayCount.act360:    ql.Actual360(),
        DayCount.thirty360: ql.Thirty360(ql.Thirty360.BondBasis),
    }[dc]


def _parse_period(term: str) -> ql.Period:
    term = term.strip().upper()
    n = int(term[:-1])
    unit = term[-1]
    if unit == 'D':
        return ql.Period(n, ql.Days)
    elif unit == 'W':
        return ql.Period(n, ql.Weeks)
    elif unit == 'M':
        return ql.Period(n, ql.Months)
    elif unit == 'Y':
        return ql.Period(n, ql.Years)
    raise ValueError(f"Cannot parse period term: {term!r}")


def _ql_date_to_str(d: ql.Date) -> str:
    return f"{d.year()}-{d.month():02d}-{d.dayOfMonth():02d}"


def _sample_curve(curve: ql.YieldTermStructure, ref: ql.Date, dc: ql.DayCounter) -> list[CurvePoint]:
    points: list[CurvePoint] = []
    max_date = curve.maxDate()
    for label, years, period in _STANDARD_TENORS:
        target = ref + period
        if target > max_date:
            continue
        zero_rate = curve.zeroRate(target, dc, ql.Compounded, ql.Annual).rate()
        df = curve.discount(target)
        fwd_3m_end = target + ql.Period(3, ql.Months)
        fwd_3m: float | None = None
        if fwd_3m_end <= max_date:
            fwd_3m = curve.forwardRate(target, fwd_3m_end, dc, ql.Compounded, ql.Annual).rate()
        points.append(CurvePoint(
            tenor=label,
            years=years,
            zero_rate=zero_rate,
            discount_factor=df,
            forward_rate_3m=fwd_3m,
        ))
    return points


def price_bond(req: BondRequest) -> BondResponse:
    settlement = req.settlement_date or date.today()
    ql_settlement = _ql_date(settlement)
    ql_maturity = _ql_date(req.maturity_date)
    ql_issue = _ql_date(req.issue_date) if req.issue_date else ql_settlement

    if ql_maturity <= ql_settlement:
        raise ValueError("maturity_date must be after settlement_date")

    ql.Settings.instance().evaluationDate = ql_settlement

    calendar = ql.NullCalendar()
    dc = _ql_dc(req.day_count)
    freq = _ql_frequency(req.frequency)
    period = _ql_period(req.frequency)

    schedule = ql.Schedule(
        ql_issue, ql_maturity, period, calendar,
        ql.Unadjusted, ql.Unadjusted,
        ql.DateGeneration.Backward, False,
    )

    bond = ql.FixedRateBond(0, req.face_value, schedule, [req.coupon_rate], dc)

    flat_ts = ql.YieldTermStructureHandle(
        ql.FlatForward(ql_settlement, req.discount_rate + req.spread, dc)
    )
    bond.setPricingEngine(ql.DiscountingBondEngine(flat_ts))

    clean_price = bond.cleanPrice()
    dirty_price = bond.dirtyPrice()
    accrued = bond.accruedAmount()

    ytm = ql.BondFunctions.bondYield(bond, clean_price, dc, ql.Compounded, freq)
    ytm_rate = ql.InterestRate(ytm, dc, ql.Compounded, freq)

    mac_dur = ql.BondFunctions.duration(bond, ytm_rate, ql.Duration.Macaulay)
    mod_dur = ql.BondFunctions.duration(bond, ytm_rate, ql.Duration.Modified)
    convexity = ql.BondFunctions.convexity(bond, ytm_rate)
    dv01 = mod_dur * dirty_price / 10_000

    cashflows = [
        CashflowItem(date=_ql_date_to_str(cf.date()), amount=round(cf.amount(), 4))
        for cf in bond.cashflows()
        if not cf.hasOccurred(ql_settlement) and cf.amount() > 0
    ]

    return BondResponse(
        clean_price=clean_price,
        dirty_price=dirty_price,
        accrued_interest=accrued,
        ytm=ytm,
        modified_duration=mod_dur,
        macaulay_duration=mac_dur,
        convexity=convexity,
        dv01=dv01,
        cashflows=cashflows,
    )


def price_bond_scenarios(req: BondRequest, rates: list[float]) -> list[dict]:
    results = []
    for r in rates:
        modified = req.model_copy(update={"discount_rate": r})
        try:
            res = price_bond(modified)
            results.append({
                "discount_rate": r,
                "clean_price": res.clean_price,
                "ytm": res.ytm,
                "modified_duration": res.modified_duration,
            })
        except Exception:
            results.append({
                "discount_rate": r,
                "clean_price": None,
                "ytm": None,
                "modified_duration": None,
            })
    return results


def price_zcb(req: ZeroCouponBondRequest) -> ZeroCouponBondResponse:
    settlement = req.settlement_date or date.today()
    ql_settlement = _ql_date(settlement)
    ql_maturity = _ql_date(req.maturity_date)

    if ql_maturity <= ql_settlement:
        raise ValueError("maturity_date must be after settlement_date")

    ql.Settings.instance().evaluationDate = ql_settlement

    dc = ql.Actual365Fixed()
    calendar = ql.NullCalendar()

    flat_ts = ql.YieldTermStructureHandle(
        ql.FlatForward(ql_settlement, req.discount_rate, dc, ql.Continuous)
    )

    bond = ql.ZeroCouponBond(
        0, calendar, req.face_value, ql_maturity,
        ql.Unadjusted, req.face_value, ql_settlement,
    )
    bond.setPricingEngine(ql.DiscountingBondEngine(flat_ts))

    price = bond.cleanPrice()
    tte = dc.yearFraction(ql_settlement, ql_maturity)
    yield_cont = -math.log(price / req.face_value) / tte if tte > 0 else 0.0
    dv01 = tte * price / 10_000

    return ZeroCouponBondResponse(price=price, yield_cont=yield_cont, duration=tte, dv01=dv01)


def price_swap(req: SwapRequest) -> SwapResponse:
    ql_start = _ql_date(req.start_date)
    ql_maturity = _ql_date(req.maturity_date)

    if ql_maturity <= ql_start:
        raise ValueError("maturity_date must be after start_date")

    ql.Settings.instance().evaluationDate = ql_start

    calendar = ql.NullCalendar()
    dc = _ql_dc(req.day_count)
    fwd_rate = req.forward_rate if req.forward_rate is not None else req.discount_rate

    discount_ts = ql.YieldTermStructureHandle(ql.FlatForward(ql_start, req.discount_rate, dc))
    forward_ts = ql.YieldTermStructureHandle(ql.FlatForward(ql_start, fwd_rate, dc))

    fixed_period = _ql_period(req.fixed_frequency)
    float_period = _ql_period(req.floating_frequency)

    fixed_sched = ql.Schedule(
        ql_start, ql_maturity, fixed_period, calendar,
        ql.ModifiedFollowing, ql.ModifiedFollowing,
        ql.DateGeneration.Forward, False,
    )
    float_sched = ql.Schedule(
        ql_start, ql_maturity, float_period, calendar,
        ql.ModifiedFollowing, ql.ModifiedFollowing,
        ql.DateGeneration.Forward, False,
    )

    index = ql.IborIndex(
        "Generic", float_period, 0,
        ql.USDCurrency(), calendar,
        ql.ModifiedFollowing, False, dc, forward_ts,
    )

    swap_type = ql.VanillaSwap.Payer if req.payer else ql.VanillaSwap.Receiver
    swap = ql.VanillaSwap(
        swap_type, req.notional,
        fixed_sched, req.fixed_rate, dc,
        float_sched, index, req.floating_spread, dc,
    )
    swap.setPricingEngine(ql.DiscountingSwapEngine(discount_ts))

    return SwapResponse(
        npv=swap.NPV(),
        fair_rate=swap.fairRate(),
        bpv=abs(swap.fixedLegBPS()),
        fixed_leg_npv=swap.fixedLegNPV(),
        floating_leg_npv=swap.floatingLegNPV(),
        fixed_leg_bps=swap.fixedLegBPS(),
        floating_leg_bps=swap.floatingLegBPS(),
    )


def price_tips(req: TIPSRequest) -> TIPSResponse:
    settlement = req.settlement_date or date.today()
    ql_settlement = _ql_date(settlement)
    ql_maturity = _ql_date(req.maturity_date)
    ql_issue = _ql_date(req.issue_date) if req.issue_date else ql_settlement

    if ql_maturity <= ql_settlement:
        raise ValueError("maturity_date must be after settlement_date")

    ql.Settings.instance().evaluationDate = ql_settlement

    index_ratio = req.current_cpi / req.base_cpi
    adjusted_principal = req.face_value * index_ratio

    # Price in real terms: standard FixedRateBond with original face and real coupon.
    # The resulting clean price IS the real clean price as % of original par.
    calendar = ql.NullCalendar()
    dc = ql.Actual365Fixed()
    freq = ql.Semiannual
    period = ql.Period(6, ql.Months)

    schedule = ql.Schedule(
        ql_issue, ql_maturity, period, calendar,
        ql.Unadjusted, ql.Unadjusted,
        ql.DateGeneration.Backward, False,
    )

    bond = ql.FixedRateBond(0, req.face_value, schedule, [req.real_coupon_rate], dc)

    real_ts = ql.YieldTermStructureHandle(
        ql.FlatForward(ql_settlement, req.real_discount_rate, dc)
    )
    bond.setPricingEngine(ql.DiscountingBondEngine(real_ts))

    real_clean = bond.cleanPrice()
    real_dirty = bond.dirtyPrice()
    accrued = bond.accruedAmount()

    real_ytm = ql.BondFunctions.bondYield(bond, real_clean, dc, ql.Compounded, freq)
    ytm_rate = ql.InterestRate(real_ytm, dc, ql.Compounded, freq)
    mod_dur = ql.BondFunctions.duration(bond, ytm_rate, ql.Duration.Modified)
    convexity = ql.BondFunctions.convexity(bond, ytm_rate)

    # Fisher equation: nominal yield = (1 + real) * (1 + inflation) - 1
    nominal_ytm = (1 + real_ytm) * (1 + req.annual_inflation_rate) - 1
    # Nominal prices: scale real % prices by index_ratio to get nominal dollar prices
    nominal_clean = (real_clean / 100.0) * adjusted_principal
    nominal_dirty = (real_dirty / 100.0) * adjusted_principal

    dv01 = mod_dur * nominal_dirty / 10_000

    # Project time to maturity for final notional
    tte = dc.yearFraction(ql_settlement, ql_maturity)
    projected_final_notional = adjusted_principal * (1 + req.annual_inflation_rate) ** tte

    # Build projected nominal cashflows
    cashflows: list[CashflowItem] = []
    for cf in bond.cashflows():
        if not cf.hasOccurred(ql_settlement) and cf.amount() > 0:
            cf_ql_date = cf.date()
            t = dc.yearFraction(ql_settlement, cf_ql_date)
            proj_ir = index_ratio * (1 + req.annual_inflation_rate) ** t
            nominal_amount = cf.amount() * proj_ir
            cashflows.append(CashflowItem(
                date=_ql_date_to_str(cf_ql_date),
                amount=round(nominal_amount, 2),
            ))

    return TIPSResponse(
        index_ratio=round(index_ratio, 6),
        adjusted_principal=round(adjusted_principal, 2),
        real_clean_price=real_clean,
        real_dirty_price=real_dirty,
        accrued_interest=accrued,
        real_ytm=real_ytm,
        nominal_clean_price=nominal_clean,
        nominal_dirty_price=nominal_dirty,
        nominal_ytm=nominal_ytm,
        modified_duration=mod_dur,
        convexity=convexity,
        dv01=dv01,
        projected_final_notional=round(projected_final_notional, 2),
        cashflows=cashflows,
    )


def bootstrap_curve(req: BootstrapRequest) -> BootstrapResponse:
    today = req.evaluation_date or date.today()
    ql_today = _ql_date(today)
    ql.Settings.instance().evaluationDate = ql_today

    calendar = ql.TARGET()
    dc_dep = ql.Actual360()
    dc_curve = ql.Actual365Fixed()
    dc_swap_fixed = ql.Thirty360(ql.Thirty360.BondBasis)

    fwd_handle = ql.RelinkableYieldTermStructureHandle()
    euribor_6m = ql.Euribor6M(fwd_handle)

    helpers: list[ql.RateHelper] = []

    for dep in req.deposits:
        period = _parse_period(dep.term)
        rate_handle = ql.QuoteHandle(ql.SimpleQuote(dep.rate))
        helpers.append(ql.DepositRateHelper(
            rate_handle, period, 2, calendar,
            ql.ModifiedFollowing, True, dc_dep,
        ))

    for swap in req.swaps:
        period = _parse_period(swap.term)
        rate_handle = ql.QuoteHandle(ql.SimpleQuote(swap.rate))
        helpers.append(ql.SwapRateHelper(
            rate_handle, period, calendar,
            ql.Annual, ql.ModifiedFollowing, dc_swap_fixed,
            euribor_6m,
        ))

    if not helpers:
        raise ValueError("Provide at least one deposit or swap rate to bootstrap a curve")

    interp = req.interpolation
    if interp == CurveInterpolation.linear:
        curve: ql.YieldTermStructure = ql.PiecewiseLinearZero(ql_today, helpers, dc_curve)
    elif interp == CurveInterpolation.cubic_spline:
        curve = ql.PiecewiseCubicZero(ql_today, helpers, dc_curve)
    else:
        curve = ql.PiecewiseLogLinearDiscount(ql_today, helpers, dc_curve)

    curve.enableExtrapolation()

    points = _sample_curve(curve, ql_today, dc_curve)

    return BootstrapResponse(
        reference_date=today.isoformat(),
        interpolation=interp.value,
        points=points,
    )


def fit_curve(req: CurveFitRequest) -> CurveFitResponse:
    today = req.evaluation_date or date.today()
    ql_today = _ql_date(today)
    ql.Settings.instance().evaluationDate = ql_today

    calendar = ql.NullCalendar()
    dc = ql.SimpleDayCounter()

    helpers: list[ql.BondHelper] = []
    for b in req.bonds:
        ql_mat = _ql_date(b.maturity_date)
        period = _ql_period(b.frequency)
        schedule = ql.Schedule(
            ql_today, ql_mat, period, calendar,
            ql.Unadjusted, ql.Unadjusted,
            ql.DateGeneration.Forward, False,
        )
        price_handle = ql.QuoteHandle(ql.SimpleQuote(b.price))
        helpers.append(ql.FixedRateBondHelper(
            price_handle, 0, 100.0, schedule,
            [b.coupon_rate], dc, ql.Unadjusted,
        ))

    if not helpers:
        raise ValueError("Provide at least one bond to fit a curve")

    method = req.method
    if method == CurveFitMethod.nelson_siegel:
        fitting = ql.NelsonSiegelFitting()
    elif method == CurveFitMethod.svensson:
        fitting = ql.SvenssonFitting()
    elif method == CurveFitMethod.exponential_splines:
        fitting = ql.ExponentialSplinesFitting()
    elif method == CurveFitMethod.cubic_bsplines:
        knots = [-30.0, -20.0, 0.0, 5.0, 10.0, 15.0, 20.0, 25.0, 30.0, 40.0, 50.0]
        fitting = ql.CubicBSplinesFitting(knots)
    else:
        fitting = ql.SimplePolynomialFitting(3)

    curve = ql.FittedBondDiscountCurve(0, calendar, helpers, dc, fitting, 1.0e-10, 5000)
    curve.enableExtrapolation()

    fit_results = curve.fitResults()
    solution = fit_results.solution()
    params = [solution[i] for i in range(solution.size())]
    iterations = fit_results.numberOfIterations()

    dc_curve = ql.Actual365Fixed()
    points = _sample_curve(curve, ql_today, dc_curve)

    return CurveFitResponse(
        reference_date=today.isoformat(),
        method=method.value,
        iterations=iterations,
        parameters=params,
        points=points,
    )
