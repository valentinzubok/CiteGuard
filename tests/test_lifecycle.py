"""Registration, verification outcomes, access control and views."""

import json
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent))
from conftest import load_contract, reset  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
mod = load_contract(ROOT)
gl = sys.modules["genlayer"]

OWNER = "0x1111111111111111111111111111111111111111"
OTHER = "0x2222222222222222222222222222222222222222"

CLAIM = "The 2026 audit reported 12,400 ETH of reserve held by the bridge."
URL = "https://audits.example/reports/2026-bridge"


def _registry():
    reset(gl)
    c = mod.CiteGuard(OWNER)
    c.register("audit/2026", CLAIM, URL, "Bridge audit 2026")
    return c


def test_register_freezes_a_supported_source():
    c = _registry()
    entry = json.loads(c.get_claim("audit/2026"))
    assert entry["status"] == "supported"
    assert entry["baseline_version"] == 1
    assert entry["baseline_hash"] and entry["baseline_chars"] > 0
    assert 0 < entry["judged_chars"] <= mod.EVIDENCE_BUDGET_CHARS
    assert json.loads(c.get_stats())["supported"] == 1


def test_register_refuses_a_claim_its_source_does_not_support():
    """A citation that does not hold at filing time never enters the registry."""
    reset(gl)
    c = mod.CiteGuard(OWNER)
    gl.llm_reply = '{"supports": false}'
    with pytest.raises(Exception, match="do not find this claim supported"):
        c.register("wishful/1", "The bridge held 99,000 ETH.", URL)
    assert json.loads(c.list_ids()) == []


def test_unchanged_source_needs_no_model():
    c = _registry()
    gl.prompts.clear()
    c.verify("audit/2026")
    entry = json.loads(c.get_claim("audit/2026"))
    assert entry["last_result"] == "unchanged"
    assert entry["status"] == "supported"
    assert gl.prompts == []  # byte-identical: decided deterministically
    assert json.loads(c.list_alerts("audit/2026")) == []


def test_rewritten_source_that_still_supports_moves_the_baseline():
    c = _registry()
    first = json.loads(c.get_claim("audit/2026"))
    gl.page = "Updated 2026-10-01. The audit confirms 12,400 ETH of reserve at the bridge."
    gl.llm_reply = '{"supports": true}'
    c.verify("audit/2026")
    entry = json.loads(c.get_claim("audit/2026"))
    assert entry["status"] == "supported"
    assert entry["last_result"] == "rewritten_still_supports"
    assert entry["baseline_version"] == 2
    assert entry["baseline_hash"] != first["baseline_hash"]
    alert = json.loads(c.list_alerts("audit/2026"))[0]
    assert alert["kind"] == "rewritten_still_supports"
    assert alert["previous_hash"] == first["baseline_hash"]


def test_source_that_stops_supporting_breaks_the_claim():
    c = _registry()
    gl.page = "This report has been withdrawn pending review. No reserve figure is stated."
    gl.llm_reply = '{"supports": false}'
    c.verify("audit/2026")
    entry = json.loads(c.get_claim("audit/2026"))
    assert entry["status"] == "broken"
    assert entry["last_result"] == "no_longer_supports"
    assert entry["pending_hash"] and entry["baseline_version"] == 1
    alert = json.loads(c.list_alerts("audit/2026"))[0]
    assert alert["kind"] == "no_longer_supports"
    stats = json.loads(c.get_stats())
    assert stats["broken"] == 1 and stats["supported"] == 0


def test_link_rot_is_recorded_not_swallowed():
    c = _registry()
    gl.page = Exception("404 not found")
    c.verify("audit/2026")
    entry = json.loads(c.get_claim("audit/2026"))
    assert entry["status"] == "unreachable"
    assert json.loads(c.list_alerts("audit/2026"))[0]["kind"] == "unreachable"

    gl.page = "   "
    c.verify("audit/2026")
    assert json.loads(c.get_claim("audit/2026"))["status"] == "unreachable"
    assert json.loads(c.get_stats())["unreachable"] == 1


def test_retract_is_publisher_or_owner_only_and_stops_verification():
    c = _registry()
    gl.message.sender_address = OTHER
    with pytest.raises(Exception, match="only the publisher or the owner"):
        c.retract("audit/2026")
    gl.message.sender_address = OWNER
    c.retract("audit/2026")
    assert json.loads(c.get_claim("audit/2026"))["status"] == "retracted"
    with pytest.raises(Exception, match="retracted"):
        c.verify("audit/2026")


def test_validation_and_views():
    c = _registry()
    with pytest.raises(Exception, match="already registered"):
        c.register("audit/2026", CLAIM, URL)
    with pytest.raises(Exception, match="https://"):
        c.register("bad/1", CLAIM, "http://audits.example/report")
    with pytest.raises(Exception, match="path segments"):
        c.register("bad/2", CLAIM, "https://audits.example/a/../b")
    with pytest.raises(Exception, match="claim is required"):
        c.register("bad/3", "   ", URL)
    assert json.loads(c.get_claim("nope"))["error"] == "unknown claim_id"
    assert json.loads(c.list_by_status("supported")) == ["audit/2026"]
    assert c.get_owner() == OWNER
