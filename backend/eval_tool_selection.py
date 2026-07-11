"""Eval: checks that each question routes to the expected tool (or no tool).

Run manually after editing llm.py's tool schemas or system prompt — catches
tool-selection regressions (e.g. two tools competing for the same phrasing,
like player_summary vs player_heatmap) without hand-testing via curl.

Usage: venv/bin/python eval_tool_selection.py
Costs a small amount of OpenAI credit per run (one gpt-5 call per case).
"""

import sys

from openai import OpenAI

from app import config, llm
from app.data_loader import get_store

TEST_CASES = [
    ("Where did Messi touch the ball most on the pitch?", {"player_heatmap"}),
    ("What areas of the pitch did Mbappé operate in?", {"player_heatmap"}),
    ("Show me Messi's heatmap", {"player_heatmap"}),
    ("How did Messi play?", {"player_summary"}),
    ("What's Messi's pass accuracy?", {"player_summary"}),
    # Either tool legitimately answers this — get_shots(player=X) includes outcome.
    ("How many goals and shots did Mbappé have?", {"player_summary", "get_shots"}),
    ("Compare xG between the two teams", {"team_xg"}),
    ("Who created the most chances?", {"chances_created"}),
    ("Show me the shot map", {"get_shots"}),
    ("What shots did Argentina take in the first half?", {"get_shots"}),
    ("How did the pass network look for Argentina?", {"pass_network"}),
    ("How did the momentum shift over the match?", {"momentum"}),
    ("Narrate the drama of this final in one line", {None}),
]


def run():
    store = get_store()
    client = OpenAI(api_key=config.OPENAI_API_KEY)

    results = []
    for question, expected in TEST_CASES:
        response = client.chat.completions.create(
            model=config.OPENAI_MODEL,
            messages=[
                {"role": "system", "content": llm.system_prompt(store)},
                {"role": "user", "content": question},
            ],
            tools=llm.TOOL_SCHEMAS,
            tool_choice="auto",
        )
        msg = response.choices[0].message
        actual = msg.tool_calls[0].function.name if msg.tool_calls else None
        ok = actual in expected
        results.append(ok)
        status = "PASS" if ok else "FAIL"
        print(f"[{status}] {question!r} -> expected={expected} actual={actual}")

    passed = sum(results)
    total = len(results)
    print(f"\n{passed}/{total} passed")
    return passed == total


if __name__ == "__main__":
    sys.exit(0 if run() else 1)
