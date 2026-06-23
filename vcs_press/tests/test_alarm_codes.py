from app.safety.alarm_codes import ALARM_DEFINITIONS, AlarmCodes, AlarmSeverity, make_alarm


def test_all_alarm_definitions_have_required_fields():
    severities = {severity.value for severity in AlarmSeverity}
    assert {"INFO", "WARNING", "CRITICAL", "EMERGENCY"} <= severities
    for code, definition in ALARM_DEFINITIONS.items():
        event = make_alarm(code)
        payload = event.to_dict()
        assert payload["alarm_code"] == definition.alarm_code
        assert payload["alarm_message"]
        assert payload["severity"] in severities
        assert payload["timestamp"]
        assert payload["recommended_action"]


def test_emergency_stop_alarm_is_emergency():
    alarm = make_alarm(AlarmCodes.EMERGENCY_STOP)
    assert alarm.severity == AlarmSeverity.EMERGENCY
    assert "emergency stop" in alarm.alarm_message
