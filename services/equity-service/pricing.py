from __future__ import annotations
from datetime import date
import QuantLib as ql
from models import (
    OptionPriceRequest, OptionPriceResponse, Greeks,
    PricingEngine, OptionType, HestonParams,
)


def _ql_date(d: date) -> ql.Date:
    return ql.Date(d.day, d.month, d.year)


def price_option(req: OptionPriceRequest) -> OptionPriceResponse:
    val_date = req.valuation_date or date.today()
    ql_val = _ql_date(val_date)
    ql_exp = _ql_date(req.maturity_date)
    ql.Settings.instance().evaluationDate = ql_val

    calendar = ql.NullCalendar()
    dc = ql.Actual365Fixed()

    opt_type = ql.Option.Call if req.call_put == "call" else ql.Option.Put
    payoff = ql.PlainVanillaPayoff(opt_type, req.strike)
    exercise = (
        ql.EuropeanExercise(ql_exp)
        if req.option_type == OptionType.european
        else ql.AmericanExercise(ql_val, ql_exp)
    )
    option = ql.VanillaOption(payoff, exercise)

    spot_h = ql.QuoteHandle(ql.SimpleQuote(req.spot))
    rate_ts = ql.YieldTermStructureHandle(ql.FlatForward(ql_val, req.risk_free_rate, dc))
    div_ts = ql.YieldTermStructureHandle(ql.FlatForward(ql_val, req.dividend_yield, dc))
    vol_ts = ql.BlackVolTermStructureHandle(ql.BlackConstantVol(ql_val, calendar, req.volatility, dc))
    bsm = ql.BlackScholesMertonProcess(spot_h, div_ts, rate_ts, vol_ts)

    if req.engine == PricingEngine.black_scholes:
        if req.option_type != OptionType.european:
            raise ValueError("Black-Scholes analytic engine is only valid for European options.")
        option.setPricingEngine(ql.AnalyticEuropeanEngine(bsm))

    elif req.engine == PricingEngine.binomial:
        option.setPricingEngine(ql.BinomialVanillaEngine(bsm, "crr", req.binomial_steps))

    elif req.engine == PricingEngine.baw:
        if req.option_type != OptionType.american:
            raise ValueError("BAW approximation is for American options.")
        option.setPricingEngine(ql.BaroneAdesiWhaleyApproximationEngine(bsm))

    elif req.engine == PricingEngine.heston:
        if req.option_type != OptionType.european:
            raise ValueError("Heston analytic engine supports European options only.")
        hp: HestonParams = req.heston_params or HestonParams()
        heston_process = ql.HestonProcess(rate_ts, div_ts, spot_h, hp.v0, hp.kappa, hp.theta, hp.sigma, hp.rho)
        model = ql.HestonModel(heston_process)
        option.setPricingEngine(ql.AnalyticHestonEngine(model))

    elif req.engine == PricingEngine.mc:
        if req.option_type == OptionType.european:
            option.setPricingEngine(
                ql.MCEuropeanEngine(bsm, "pseudorandom", timeSteps=365, requiredSamples=10_000, seed=42)
            )
        else:
            option.setPricingEngine(
                ql.MCAmericanEngine(bsm, "pseudorandom", timeSteps=100, requiredSamples=10_000, seed=42)
            )

    price = option.NPV()

    try:
        delta = option.delta()
        gamma = option.gamma()
        vega = option.vega()
        theta = option.theta()
        rho = option.rho()
    except Exception:
        delta = gamma = vega = theta = rho = float("nan")

    tte = dc.yearFraction(ql_val, ql_exp)
    return OptionPriceResponse(
        price=price,
        greeks=Greeks(delta=delta, gamma=gamma, vega=vega, theta=theta, rho=rho),
        engine_used=req.engine.value,
        option_type=req.option_type.value,
        call_put=req.call_put.value,
        time_to_expiry_years=float(tte),
    )


def price_scenario_grid(req: OptionPriceRequest, spots: list[float], vols: list[float]) -> list[dict]:
    results = []
    for s in spots:
        for v in vols:
            modified = req.model_copy(update={"spot": s, "volatility": v})
            try:
                r = price_option(modified)
                results.append({"spot": s, "volatility": v, "price": r.price,
                                 "delta": r.greeks.delta, "gamma": r.greeks.gamma})
            except Exception:
                results.append({"spot": s, "volatility": v, "price": None, "delta": None, "gamma": None})
    return results
