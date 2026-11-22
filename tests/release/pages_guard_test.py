"""A Pages manual dispatch must never publish an integration/feature artifact."""
import ast
from pathlib import Path
import re
import unittest

WORKFLOW = Path(__file__).resolve().parents[2] / '.github/workflows/deploy-pages.yml'


def permits(condition, ref):
    # Evaluate only the small literal/ref boolean subset used by this workflow.
    expression = condition.replace('github.ref', repr(ref)).replace('||', 'or').replace('&&', 'and')
    tree = ast.parse(expression, mode='eval')
    allowed = (ast.Expression, ast.BoolOp, ast.Or, ast.And, ast.Compare, ast.Eq, ast.NotEq, ast.Constant)
    if any(not isinstance(node, allowed) for node in ast.walk(tree)):
        raise AssertionError('Unsupported guard expression: review it before extending this evaluator')
    return eval(compile(tree, '<pages-guard>', 'eval'), {'__builtins__': {}}, {})


class PagesPublishingBoundary(unittest.TestCase):
    def test_each_publishing_job_excludes_nonpublishing_refs(self):
        text = WORKFLOW.read_text()
        for job in ('build', 'deploy'):
            match = re.search(r'^  ' + job + r':\n(.*?)(?=^  [a-zA-Z_-]+:|\Z)', text, re.M | re.S)
            self.assertIsNotNone(match, job)
            guard = re.search(r'^    if: (.+)$', match[1], re.M)
            self.assertIsNotNone(guard, f'{job}: manual dispatch needs a ref guard')
            for ref in ('refs/heads/integration', 'refs/heads/feat/private-product-execution', 'refs/pull/30/merge', 'refs/tags/v1'):
                with self.subTest(job=job, ref=ref):
                    self.assertFalse(permits(guard[1], ref))
            for ref in ('refs/heads/main', 'refs/heads/master'):
                with self.subTest(job=job, ref=ref):
                    self.assertTrue(permits(guard[1], ref))


if __name__ == '__main__':
    unittest.main()
