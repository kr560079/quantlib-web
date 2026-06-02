"""Cloud Function: lightweight Black-Scholes / Bachelier calculator."""
from __future__ import annotations
import json
import math
import functions_framework
from scipy.stats import norm


def _black_scholes(S: float, K: float, T: float, r: float, q: float, sigma: float, cp: str) -> dict:
    if T <= 0:
        intrinsic = max(S - K, 0) if cp == "call" else max(K - S, 0)
        return {"price": intrinsic, "delta": None, "gamma": None, "vega": None, "theta": None, "rho": None}

    d1 = (math.log(S / K) + (r - q + 0.5 * sigma ** 2) * T) / (sigma * math.sqrt(T))
    d2 = d1 - sigma * math.sqrt(T)
    sqrt_T = math.sqrt(T)
    exp_rT = math.exp(-r * T)
    exp_qT = math.exp(-q * T)

    if cp == "call":
        price = S * exp_qT * norm.cdf(d1) - K * exp_rT * norm.cdf(d2)
        delta = exp_qT * norm.cdf(d1)
        rho = K * T * exp_rT * norm.cdf(d2) / 100
    else:
        price = K * exp_rT * norm.cdf(-d2) - S * exp_qT * norm.cdf(-d1)
        delta = -exp_qT * norm.cdf(-d1)
        rho = -K * T * exp_rT * norm.cdf(-d2) / 100

    gamma = exp_qT * norm.pdf(d1) / (S * sigma * sqrt_T)
    vega = S * exp_qT * norm.pdf(d1) * sqrt_T / 100
    theta_call = (
        -(S * norm.pdf(d1) * sigma * exp_qT) / (2 * sqrt_T)
        - r * K * exp_rT * norm.cdf(d2)
        + q * S * exp_qT * norm.cdf(d1)
    ) / 365
    theta_put = (
        -(S * norm.pdf(d1) * sigma * exp_qT) / (2 * sqrt_T)
        + r * K * exp_rT * norm.cdf(-d2)
        - q * S * exp_qT * norm.cdf(-d1)
    ) / 365
    theta = theta_call if cp == "call" else theta_put

    return {"price": price, "delta": delta, "gamma": gamma, "vega": vega, "theta": theta, "rho": rho}


@functions_framework.http
def black_formula(request):
    cors_headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Content-Type": "application/json",
    }

    if request.method == "OPTIONS":
        return ("", 204, cors_headers)

    try:
        data = request.get_json(force=True)
        result = _black_scholes(
            S=float(data["spot"]),
            K=float(data["strike"]),
            T=float(data["time_to_expiry"]),
            r=float(data["risk_free_rate"]),
            q=float(data.get("dividend_yield", 0.0)),
            sigma=float(data["volatility"]),
            cp=str(data.get("call_put", "call")),
        )
        return (json.dumps(result), 200, cors_headers)
    except (KeyError, TypeError, ValueError) as e:
        return (json.dumps({"error": str(e)}), 400, cors_headers)
