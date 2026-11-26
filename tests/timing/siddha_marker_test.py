"""Offline source-transcription fixture for Muhurtacintamani 1.4.

Inputs are supplied synthetic facts. No location, calendar provider, or
precedence policy is consulted. Run with python3 tests/timing/siddha_marker_test.py.
"""

import unittest


HALVES = ("waxing", "waning")
WEEKDAYS = ("Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday")
PAIRINGS = ("Friday", "Wednesday", "Tuesday", "Saturday", "Thursday")


def evaluate_pair(half, ordinal, weekday, evidence):
    if (
        half not in HALVES
        or type(ordinal) is not int
        or not 1 <= ordinal <= 15
        or weekday not in WEEKDAYS
        or evidence != "determinate"
    ):
        return "UNAVAILABLE"
    return "MATCH" if weekday == PAIRINGS[(ordinal - 1) % 5] else "NO_SIGNAL"


class SiddhaMarkerFixture(unittest.TestCase):
    def test_transcribed_pairings_across_both_halves(self):
        # Printed p. 11 supplies the repeated classes. P. 12 supplies the weekday pairings.
        expected_ordinals = {
            "Monday": (),
            "Tuesday": (3, 8, 13),
            "Wednesday": (2, 7, 12),
            "Thursday": (5, 10, 15),
            "Friday": (1, 6, 11),
            "Saturday": (4, 9, 14),
            "Sunday": (),
        }
        counts = {"MATCH": 0, "NO_SIGNAL": 0}
        for half in HALVES:
            for weekday, expected in expected_ordinals.items():
                for ordinal in range(1, 16):
                    with self.subTest(half=half, weekday=weekday, ordinal=ordinal):
                        result = evaluate_pair(half, ordinal, weekday, "determinate")
                        self.assertEqual(result, "MATCH" if ordinal in expected else "NO_SIGNAL")
                        counts[result] += 1
        self.assertEqual(counts, {"MATCH": 30, "NO_SIGNAL": 180})

    def test_missing_or_inconsistent_evidence_is_unavailable(self):
        for row in (
            (None, 11, "Friday", "determinate"),
            ("unknown", 11, "Friday", "determinate"),
            ("waxing", None, "Friday", "determinate"),
            ("waxing", 0, "Friday", "determinate"),
            ("waxing", 16, "Friday", "determinate"),
            ("waxing", 11.0, "Friday", "determinate"),
            ("waxing", True, "Friday", "determinate"),
            ("waxing", 11, None, "determinate"),
            ("waxing", 11, "Funday", "determinate"),
            ("waxing", 11, "Friday", None),
            ("waxing", 11, "Friday", "uncertain"),
            ("waxing", 11, "Friday", "contradictory"),
        ):
            with self.subTest(row=row):
                self.assertEqual(evaluate_pair(*row), "UNAVAILABLE")

    def test_synthetic_friday_boundary(self):
        # Minutes on an arbitrary synthetic clock. The intervals are half-open.
        intervals = ((540, 645, 11), (645, 660, 12))
        for minute, expected in ((539, "UNAVAILABLE"), (644, "MATCH"), (645, "NO_SIGNAL"), (660, "UNAVAILABLE")):
            candidates = [ordinal for start, end, ordinal in intervals if start <= minute < end]
            ordinal = candidates[0] if len(candidates) == 1 else None
            with self.subTest(minute=minute):
                self.assertEqual(evaluate_pair("waxing", ordinal, "Friday", "determinate"), expected)
        # An unresolved boundary admits both ordinals. No ordinal may be inferred.
        for ordinal in (11, 12):
            self.assertEqual(evaluate_pair("waxing", ordinal, "Friday", "uncertain"), "UNAVAILABLE")


if __name__ == "__main__":
    unittest.main(verbosity=2)
