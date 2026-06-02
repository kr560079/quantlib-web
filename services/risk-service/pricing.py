from __future__ import annotations
import math
import numpy as np
from scipy.stats import norm

from models import (
    ParametricVaRRequest, VaRResponse,
    HistoricalVaRRequest,
    MCVaRRequest, MCVaRResponse, HistogramBin,
    PortfolioVaRRequest, PortfolioVaRResponse, PositionVaR,
    GreeksPnLRequest, GreeksPnLResponse,
    OptionStressRequest, OptionStressResponse, ScenarioResult,
)


def calc_parametric_var(req: ParametricVaRRequest) -> VaRResponse:
    t = req.holding_period_days / 252
    sigma_t = req.volatility * math.sqrt(t)
    z = float(norm.ppf(req.confidence_level))

    var_pct = z * sigma_t
    var = var_pct * abs(req.position_value)
    es_pct = float(norm.pdf(z)) / (1 - req.confidence_level) * sigma_t
    es = es_pct * abs(req.position_value)

    return VaRResponse(
        var=var, var_pct=var_pct,
        expected_shortfall=es, es_pct=es_pct,
        confidence_level=req.confidence_level,
        holding_period_days=req.holding_period_days,
        method="parametric",
    )


def calc_historical_var(req: HistoricalVaRRequest) -> VaRResponse:
    r = np.asarray(req.returns, dtype=float)
    scaled = r * math.sqrt(req.holding_period_days)

    alpha = 1 - req.confidence_level
    var_pct = float(-np.percentile(scaled, alpha * 100))
    var = var_pct * abs(req.position_value)

    threshold = np.percentile(scaled, alpha * 100)
    tail = scaled[scaled <= threshold]
    es_pct = float(-np.mean(tail)) if tail.size > 0 else var_pct
    es = es_pct * abs(req.position_value)

    return VaRResponse(
        var=var, var_pct=var_pct,
        expected_shortfall=es, es_pct=es_pct,
        confidence_level=req.confidence_level,
        holding_period_days=req.holding_period_days,
        method="historical",
    )


def calc_mc_var(req: MCVaRRequest) -> MCVaRResponse:
    rng = np.random.default_rng(42)
    t = req.holding_period_days / 252

    z = rng.standard_normal(req.simulations)
    log_returns = (req.drift - 0.5 * req.volatility ** 2) * t + req.volatility * math.sqrt(t) * z

    alpha = 1 - req.confidence_level
    var_pct = float(-np.percentile(log_returns, alpha * 100))
    var = var_pct * abs(req.position_value)

    threshold = np.percentile(log_returns, alpha * 100)
    tail = log_returns[log_returns <= threshold]
    es_pct = float(-np.mean(tail)) if tail.size > 0 else var_pct
    es = es_pct * abs(req.position_value)

    pcts = [1, 5, 10, 25, 50, 75, 90, 95, 99]
    percentiles = {f"p{p}": float(np.percentile(log_returns, p)) for p in pcts}

    counts, edges = np.histogram(log_returns, bins=40, density=True)
    histogram = [
        HistogramBin(midpoint=float((edges[i] + edges[i + 1]) / 2), density=float(counts[i]))
        for i in range(len(counts))
    ]

    return MCVaRResponse(
        var=var, var_pct=var_pct,
        expected_shortfall=es, es_pct=es_pct,
        confidence_level=req.confidence_level,
        holding_period_days=req.holding_period_days,
        simulations=req.simulations,
        percentiles=percentiles,
        histogram=histogram,
        method="monte_carlo",
    )


def calc_portfolio_var(req: PortfolioVaRRequest) -> PortfolioVaRResponse:
    n = len(req.positions)
    values = np.array([p.value for p in req.positions], dtype=float)
    vols = np.array([p.volatility for p in req.positions], dtype=float)

    corr = np.full((n, n), req.avg_correlation)
    np.fill_diagonal(corr, 1.0)

    t = req.holding_period_days / 252
    z = float(norm.ppf(req.confidence_level))

    cov = np.diag(vols) @ corr @ np.diag(vols)  # return covariance matrix

    port_variance = float(values @ cov @ values) * t
    port_std = math.sqrt(max(port_variance, 0.0))

    portfolio_var = z * port_std
    total_abs = float(np.sum(np.abs(values)))
    portfolio_var_pct = portfolio_var / total_abs if total_abs > 0 else 0.0
    portfolio_es = float(norm.pdf(z)) / (1 - req.confidence_level) * port_std

    individual_vars = z * np.abs(values) * vols * math.sqrt(t)
    undiversified_var = float(np.sum(individual_vars))
    diversification_benefit = undiversified_var - portfolio_var
    db_pct = diversification_benefit / undiversified_var if undiversified_var > 0 else 0.0

    if port_std > 0:
        marginal = z * math.sqrt(t) * (cov @ values) / port_std
        component_vars = marginal * values
    else:
        component_vars = np.zeros(n)

    positions_out = [
        PositionVaR(
            name=req.positions[i].name,
            value=float(values[i]),
            individual_var=float(individual_vars[i]),
            component_var=float(component_vars[i]),
        )
        for i in range(n)
    ]

    return PortfolioVaRResponse(
        portfolio_var=portfolio_var,
        portfolio_var_pct=portfolio_var_pct,
        portfolio_es=portfolio_es,
        undiversified_var=undiversified_var,
        diversification_benefit=diversification_benefit,
        diversification_benefit_pct=db_pct,
        positions=positions_out,
        confidence_level=req.confidence_level,
        holding_period_days=req.holding_period_days,
    )


def calc_greeks_pnl(req: GreeksPnLRequest) -> GreeksPnLResponse:
    dS = req.spot_change
    delta_pnl = req.delta * dS
    gamma_pnl = 0.5 * req.gamma * dS ** 2
    # QuantLib vega is dP/d_sigma (sigma in decimal); vol_change is absolute decimal
    vega_pnl = req.vega * req.vol_change
    # QuantLib theta is already price decay per calendar day
    theta_pnl = req.theta * req.days_elapsed
    # QuantLib rho is dP/d_rate (rate in decimal); rate_change is absolute decimal
    rho_pnl = req.rho * req.rate_change

    total = delta_pnl + gamma_pnl + vega_pnl + theta_pnl + rho_pnl
    first_order = delta_pnl + vega_pnl + theta_pnl + rho_pnl

    return GreeksPnLResponse(
        delta_pnl=delta_pnl,
        gamma_pnl=gamma_pnl,
        vega_pnl=vega_pnl,
        theta_pnl=theta_pnl,
        rho_pnl=rho_pnl,
        total_pnl=total,
        total_first_order_pnl=first_order,
    )


def _bsm(S: float, K: float, T: float, r: float, q: float, sigma: float, cp: str):
    if T <= 0:
        intrinsic = max(S - K, 0.0) if cp == "call" else max(K - S, 0.0)
        return intrinsic, None
    sqrt_T = math.sqrt(T)
    d1 = (math.log(S / K) + (r - q + 0.5 * sigma ** 2) * T) / (sigma * sqrt_T)
    d2 = d1 - sigma * sqrt_T
    exp_rT, exp_qT = math.exp(-r * T), math.exp(-q * T)
    if cp == "call":
        price = S * exp_qT * float(norm.cdf(d1)) - K * exp_rT * float(norm.cdf(d2))
        delta = exp_qT * float(norm.cdf(d1))
    else:
        price = K * exp_rT * float(norm.cdf(-d2)) - S * exp_qT * float(norm.cdf(-d1))
        delta = -exp_qT * float(norm.cdf(-d1))
    return price, delta


def calc_option_stress(req: OptionStressRequest) -> OptionStressResponse:
    base_price, base_delta = _bsm(
        req.spot, req.strike, req.time_to_expiry_years,
        req.risk_free_rate, req.dividend_yield, req.volatility, req.call_put,
    )

    results: list[ScenarioResult] = []
    for s in req.scenarios:
        S_new = req.spot * (1 + s.spot_shock_pct)
        sigma_new = max(req.volatility + s.vol_shock_abs, 1e-4)
        r_new = req.risk_free_rate + s.rate_shock_abs
        try:
            price_new, delta_new = _bsm(
                S_new, req.strike, req.time_to_expiry_years,
                r_new, req.dividend_yield, sigma_new, req.call_put,
            )
            pnl = (price_new - base_price) * req.position_size
        except Exception:
            price_new, delta_new, pnl = float("nan"), None, float("nan")
        results.append(ScenarioResult(
            name=s.name,
            spot_shocked=S_new,
            vol_shocked=sigma_new,
            rate_shocked=r_new,
            price=price_new,
            pnl=pnl,
            delta=delta_new,
        ))

    return OptionStressResponse(
        base_price=base_price,
        base_delta=base_delta,
        position_size=req.position_size,
        scenarios=results,
    )
