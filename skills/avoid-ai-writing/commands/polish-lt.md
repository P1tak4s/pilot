Išpolirink viso projekto lietuvišką tekstą su `lt-rasyba` skill'u (režimas „Audituoti“, visa eiga iki taisymo imtinai).

1. Paleisk `python3 ~/.claude/skills/lt-rasyba/scripts/lt_lint.py <projektas>`.
2. Perskaityk vartotojui matomą tekstą pagal SKILL.md audito eigą: i18n failai, komponentai, el. laiškai, edge funkcijų pranešimai.
3. PRIEŠ taisydamas parodyk 3–5 pavyzdžius (DABAR / SIŪLAU / KODĖL) ir lauk patvirtinimo: taisyti viską, tik 🔴, failą po failo ar tik ataskaitą.
4. Taisyk tik tekstą: ne raktus, ne kodą, ne regex. Po taisymo vėl paleisk linterį ir projekto patikras.

Projektas (jei nenurodytas, dabartinis katalogas):
$ARGUMENTS
