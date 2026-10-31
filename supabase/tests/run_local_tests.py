#!/usr/bin/env python3
"""
Executa a migração de segurança e a suíte de testes de hardening num
PostgreSQL descartável, local. Não toca em nenhuma base de dados real.

Uso:
    pip install pgserver
    python3 supabase/tests/run_local_tests.py

O Postgres é criado num diretório temporário e apagado no fim. O runner:
  1. aplica o stub que emula o Supabase (papéis, auth.uid(), tabelas, RLS);
  2. aplica a migração de segurança;
  3. aplica a migração OUTRA VEZ, para provar idempotência;
  4. executa os testes e resume PASS/FALHOU.
"""

from __future__ import annotations

import pathlib
import subprocess
import sys
import tempfile

try:
    import pgserver
except ImportError:
    sys.exit("Dependência em falta. Execute: pip install pgserver")

HERE = pathlib.Path(__file__).resolve().parent
REPO = HERE.parent.parent
MIGRATION = REPO / "supabase" / "migrations" / "2026-10-28_security_hardening.sql"
STUB = HERE / "000_local_stub.sql"
TESTS = HERE / "100_security_hardening.test.sql"

PSQL = pathlib.Path(pgserver.__file__).parent / "pginstall" / "bin" / "psql"


def run_file(uri: str, path: pathlib.Path, label: str) -> tuple[int, str]:
    result = subprocess.run(
        [str(PSQL), "-X", "-q", "-v", "ON_ERROR_STOP=1", "-f", str(path), uri],
        capture_output=True,
        text=True,
    )
    output = (result.stdout or "") + (result.stderr or "")
    return result.returncode, output


def main() -> int:
    if not PSQL.exists():
        sys.exit(f"psql não encontrado em {PSQL}")

    pgdata = tempfile.mkdtemp(prefix="esai-test-pg-")
    server = pgserver.get_server(pgdata)
    uri = server.get_uri()

    print(f"Postgres descartável: {pgdata}")
    print(f"Ligação:               {uri}\n")

    failures = 0

    steps = [
        (STUB, "1/4 · stub Supabase"),
        (MIGRATION, "2/4 · migração de segurança"),
        (MIGRATION, "3/4 · migração novamente (idempotência)"),
    ]

    for path, label in steps:
        code, output = run_file(uri, path, label)
        status = "OK" if code == 0 else "ERRO"
        print(f"[{status}] {label}")
        if output.strip():
            for line in output.strip().splitlines():
                print(f"        {line}")
        if code != 0:
            print("\nA migração falhou — testes não executados.")
            return 1
        print()

    code, output = run_file(uri, TESTS, "4/4 · testes")
    if code != 0:
        print("[ERRO] suíte de testes abortou:\n")
        print(output)
        return 1

    rows = [line for line in output.splitlines() if line.count("|") == 2]
    if not rows:
        print("Não foi possível interpretar o resultado dos testes.")
        print(output)
        return 1

    passed = 0
    for row in rows:
        status, name, detail = (field.strip() for field in row.split("|", 2))
        if status == "PASS":
            passed += 1
            print(f"  PASS    {name:<44} {detail}")
        else:
            failures += 1
            print(f"  FALHOU  {name:<44} {detail}")

    print(f"\n{passed} passaram · {failures} falharam · {len(rows)} no total")
    return 0 if failures == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
