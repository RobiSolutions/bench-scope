# Git krok po kroku: dziennik bench-scope

Każdy krok wykonany w tym repozytorium, zapisany tak, żeby dało się go
powtórzyć od zera w innym projekcie. Przy każdym poleceniu jest to, co
zobaczysz w terminalu, i sposób sprawdzenia, że się udało.

Konwencja:

- `$` na początku linii oznacza polecenie do wpisania (bez samego `$`).
- Bloki bez `$` to wyjście z terminala: tak powinno wyglądać, hashe
  commitów u ciebie będą inne.
- ✅ oznacza krok wykonany w tym repo, ⏳ oznacza krok do zrobienia.

---

## Słowniczek na start

| pojęcie | co to jest |
|---|---|
| **repozytorium (repo)** | folder projektu plus ukryty folder `.git`, w którym Git trzyma całą historię |
| **commit** | zapisany stan plików z opisem, autorem i datą; ma unikalny hash, np. `fe07108` |
| **gałąź (branch)** | ruchoma etykieta wskazująca na commit; rośnie z każdym nowym commitem |
| **`main`** | główna gałąź: tu trafia tylko skończona, sprawdzona praca |
| **remote / `origin`** | drugie repozytorium, np. na GitHubie; `origin` to umowna nazwa głównego |
| **push** | wysłanie commitów z lokalnego repo do remote'a |
| **PR (pull request)** | prośba na GitHubie: „włącz moją gałąź do `main`”, z miejscem na review i CI |

**Commit lokalny a commit na GitHubie** to ten sam commit z tym samym
hashem, tylko leżący w dwóch miejscach. `git commit` zapisuje u ciebie,
`git push` wysyła kopię na GitHub. Push nigdy niczego nie commituje: wysyła
tylko to, co już zostało zacommitowane.

```
pliki robocze --git add--> poczekalnia (staging) --git commit--> repo lokalne --git push--> GitHub
```

---

## Krok 0 ✅ - stan wyjściowy

Repo było założone lokalnie (`git init`) i miało jeden commit na gałęzi
`master`. Remote'a nie było.

```
$ git log --oneline
76ed258 The core before the pixels: waveforms and a trigger that holds still

$ git remote -v
                      (puste - brak remote'a)
```

Sprawdzenie, kto podpisuje commity (to trafia do każdego commita na zawsze):

```
$ git config user.name
RobiSolutions
$ git config user.email
kontakt@robisolutionsit.com
```

> Jeśli tu jest coś złego, popraw **przed** pierwszym pushem:
> `git config --global user.name "..."` i `git config --global user.email "..."`.
> Email jest publiczny w historii publicznego repo.

---

## Krok 1 ✅ - zmiana nazwy `master` na `main`

**Po co:** GitHub i większość narzędzi używa `main` jako nazwy gałęzi
głównej. Jeśli wypchniesz `master`, na GitHubie domyślną gałęzią zostanie
`master`, a zmiana tego później to dodatkowa robota.

**Uwaga:** tu byliśmy już na gałęzi `feat/instrument` (utworzonej przez
`git switch -c feat/instrument`), więc zmieniamy nazwę gałęzi, na której
akurat nie jesteśmy. To działa, bo `git branch -m STARA NOWA` nie wymaga
przełączenia się.

```
$ git branch -m master main
```

Sprawdzenie (gwiazdka oznacza bieżącą gałąź):

```
$ git branch
* feat/instrument
  main
```

**Żeby każde nowe repo od razu miało `main`** (jednorazowo, globalnie):

```
$ git config --global init.defaultBranch main
```

---

## Krok 1b ✅ - właściwy klucz SSH dla tego repo

**Problem:** na tym komputerze są dwa klucze SSH do dwóch kont GitHuba:

| klucz | konto GitHub |
|---|---|
| `~/.ssh/id_ed25519_personal` | **RobiSolutions** |
| `~/.ssh/id_ed25519_work` | **qvertech** |

Bez wskazania klucza SSH bierze ten, który agent poda pierwszy. Dziś trafia
w RobiSolutions, ale po restarcie albo dodaniu klucza do agenta w innej
kolejności push mógłby pójść na konto qvertech i zostać odrzucony
(„Permission denied” / „Repository not found”).

**Jak sprawdzić, który klucz loguje na które konto** (bezpieczne, tylko
test logowania):

```
$ ssh -T -o IdentitiesOnly=yes -i ~/.ssh/id_ed25519_personal git@github.com
Hi RobiSolutions! You've successfully authenticated, but GitHub does not provide shell access.
```

**Rozwiązanie:** przypisanie klucza temu jednemu repo. To ustawienie
lokalne, trafia do `.git/config`, nie do żadnego commita i nie dotyczy
innych projektów:

```
$ git config core.sshCommand "ssh -i ~/.ssh/id_ed25519_personal -o IdentitiesOnly=yes"
```

Sprawdzenie:

```
$ git config --local --get core.sshCommand
ssh -i ~/.ssh/id_ed25519_personal -o IdentitiesOnly=yes
```

> W każdym nowym repo, które ma iść na konto RobiSolutions, powtórz to
> polecenie (albo zrób wpis w `~/.ssh/config`, jeśli zechcesz to ustawić
> raz dla wszystkich projektów).

---

## Krok 2 ✅ - commit Etapu 1 na gałęzi `feat/instrument`

**Po co gałąź:** `main` ma zawierać tylko rzeczy skończone. Nowa praca
powstaje na osobnej gałęzi, a do `main` trafia przez PR. Gałąź została
utworzona na początku pracy:

```
$ git switch -c feat/instrument
Switched to a new branch 'feat/instrument'
```

### 2.1 Zobacz, co się zmieniło

```
$ git status --short
 M README.md
 M src/core/waveform.ts
?? index.html
?? src/core/__tests__/sweep.test.ts
?? src/core/__tests__/units.test.ts
?? src/core/sweep.ts
?? src/core/units.ts
?? src/main.ts
?? src/ui/
```

`M` to plik zmieniony, `??` to plik nowy, którego Git jeszcze nie śledzi.

Szczegóły zmian w śledzonych plikach:

```
$ git diff
```

### 2.2 Sprawdź, że projekt działa, zanim go zapiszesz

```
$ npm test
      Tests  36 passed (36)
$ npm run build
✓ built in 239ms
```

Commit z nieprzechodzącymi testami zadziała, ale potem trudno znaleźć, od
którego miejsca coś się zepsuło.

### 2.3 Dodaj pliki do poczekalni (staging)

```
$ git add README.md index.html src/
```

Lepiej wymieniać pliki i foldery niż pisać `git add .`: wtedy nie wpadnie
przypadkiem nic, czego nie chcesz (np. zrzuty ekranu, pliki `.env`).

Sprawdzenie (litera w **pierwszej** kolumnie oznacza „w poczekalni”):

```
$ git status --short
M  README.md
A  index.html
A  src/core/__tests__/sweep.test.ts
A  src/core/__tests__/units.test.ts
A  src/core/sweep.ts
A  src/core/units.ts
M  src/core/waveform.ts
A  src/main.ts
A  src/ui/screen.ts
A  src/ui/style.css
```

> Wycofanie pliku z poczekalni bez utraty zmian: `git restore --staged PLIK`.

### 2.4 Commit

Krótki opis w jednym poleceniu:

```
$ git commit -m "The instrument: a screen that holds a trace still"
```

Opis z treścią (tytuł, pusta linia, akapity): samo `git commit` otwiera
edytor. W tym repo commit ma tytuł i treść:

```
The instrument: a screen that holds a trace still

Stage 1 from the README. A graticule, a phosphor trace that fades over
a few frames, and a front panel: time/div and volts/div in 1-2-5 steps,
trigger level, edge and noise reject, and the four signal kinds.
...
```

Zasady dobrego opisu:

- tytuł do ok. 60 znaków, mówi **co** się zmieniło;
- treść mówi **dlaczego** i co nieoczywistego jest w środku;
- jeden commit to jedna logiczna zmiana (dlatego ten dziennik ma
  osobny commit).

### 2.5 Sprawdzenie

```
$ git log --oneline --graph --all
* fe07108 The instrument: a screen that holds a trace still
* 76ed258 The core before the pixels: waveforms and a trigger that holds still

$ git status
On branch feat/instrument
nothing to commit, working tree clean
```

`working tree clean` oznacza, że wszystko jest zacommitowane. Teraz, i
dopiero teraz, jest co wysłać na GitHub.

### 2.6 Drugi commit: ten dziennik

Dokumentacja to osobna logiczna zmiana, więc dostała osobny commit na tej
samej gałęzi:

```
$ git add docs/git-krok-po-kroku.md README.md
$ git commit -m "A step-by-step git journal, in Polish"
```

Gałąź `feat/instrument` ma więc dwa commity więcej niż `main`. Zobaczysz
to w `git log --oneline --graph --all`, a potem w PR-ze.

---

## Krok 3 ✅ - puste repo na GitHubie (w przeglądarce)

1. Zaloguj się na <https://github.com> jako **RobiSolutions**. Sprawdź
   awatar w prawym górnym rogu, żeby nie założyć repo na koncie qvertech.
2. Prawy górny róg: **+** → **New repository**.
3. **Owner:** `RobiSolutions`.
4. **Repository name:** `bench-scope`.
5. **Description** (opcjonalnie): `A browser oscilloscope that grows into a diagnostics trainer`.
6. **Public** (Actions w publicznym repo są bez limitu minut).
7. **Initialize this repository with:** zostaw wszystko
   **odznaczone**:
   - ☐ Add a README file
   - ☐ Add .gitignore → *None*
   - ☐ Choose a license → *None*

   **Dlaczego:** każda z tych opcji tworzy na GitHubie commit, którego nie
   ma lokalnie. Historie się rozjadą i pierwszy push zostanie odrzucony
   (`rejected ... fetch first`). Licencję dodamy później, zwykłym commitem.
8. **Create repository.**
9. GitHub pokaże stronę „Quick setup”. Przełącz na **SSH** i skopiuj adres:
   `git@github.com:RobiSolutions/bench-scope.git`.

**Sprawdzenie z terminala, że repo istnieje i jest puste** (tylko odczyt,
niczego nie wysyła):

```
$ git ls-remote git@github.com:RobiSolutions/bench-scope.git
                      (puste wyjście, kod wyjścia 0 - repo jest, gałęzi brak)
```

Dla porównania, zanim repo powstało:

```
ERROR: Repository not found.
fatal: Could not read from remote repository.
```

> Ten sam błąd zobaczysz, gdy SSH zaloguje cię na **inne konto** (np.
> qvertech) - dla GitHuba cudze prywatne repo „nie istnieje”. Wtedy wróć do
> kroku 1b.

**Obok, w ustawieniach konta (Settings → Emails):** adres, którym
podpisane są commity (`kontakt@robisolutionsit.com`), musi być na liście
zweryfikowanych, inaczej GitHub nie połączy commitów z kontem (brak
awatara, commity nie liczą się do aktywności na profilu). Adres logowania
(Primary) to osobna sprawa i można go zmieniać bez wpływu na repo.
Opcja *Block command line pushes that expose my email* odrzuci push
podpisany prawdziwym adresem - włączaj ją tylko razem z adresem noreply.

---

## Krok 4 ✅ - połączenie z GitHubem i push

### 4.1 Dodaj remote

```
$ git remote add origin git@github.com:RobiSolutions/bench-scope.git
```

Sprawdzenie:

```
$ git remote -v
origin  git@github.com:RobiSolutions/bench-scope.git (fetch)
origin  git@github.com:RobiSolutions/bench-scope.git (push)
```

> Pomyłka w adresie: `git remote set-url origin POPRAWNY_ADRES`.

### 4.2 Wypchnij `main`

```
$ git push -u origin main
To github.com:RobiSolutions/bench-scope.git
 * [new branch]      main -> main
branch 'main' set up to track 'origin/main'.
```

`* [new branch]` oznacza, że tej gałęzi na GitHubie jeszcze nie było.

`-u` (upstream) zapamiętuje, że lokalny `main` odpowiada `origin/main`.
Potem wystarczy samo `git push` i `git pull`, a `git status` zacznie
pokazywać „ahead / behind”.

Pierwszy push na `main` sprawia, że GitHub uzna go za gałąź domyślną.

### 4.3 Wypchnij gałąź z pracą

```
$ git push -u origin feat/instrument
remote:
remote: Create a pull request for 'feat/instrument' on GitHub by visiting:
remote:      https://github.com/RobiSolutions/bench-scope/pull/new/feat/instrument
remote:
To github.com:RobiSolutions/bench-scope.git
 * [new branch]      feat/instrument -> feat/instrument
branch 'feat/instrument' set up to track 'origin/feat/instrument'.
```

Linie z `remote:` pisze GitHub, nie Git: to gotowy link do PR-a.

### 4.4 Sprawdzenie

Która gałąź lokalna śledzi którą zdalną (w nawiasach kwadratowych):

```
$ git branch -vv
* feat/instrument ec50bdc [origin/feat/instrument] A step-by-step git journal, in Polish
  main            76ed258 [origin/main] The core before the pixels: ...
```

Cała historia z etykietami gałęzi lokalnych i zdalnych:

```
$ git log --oneline --graph --all --decorate
* ec50bdc (HEAD -> feat/instrument, origin/feat/instrument) A step-by-step git journal, in Polish
* fe07108 The instrument: a screen that holds a trace still
* 76ed258 (origin/main, main) The core before the pixels: ...
```

Jak to czytać:

- `main` i `origin/main` wskazują na ten sam commit, czyli GitHub ma
  dokładnie to, co ty;
- `feat/instrument` jest dwa commity przed `main`: to są te dwa commity,
  które wejdą do `main` przez PR;
- `HEAD ->` wskazuje gałąź, na której teraz jesteś.

### 4.5 Kolejne zmiany na tej samej gałęzi

Każdy następny commit na `feat/instrument` wysyła się już samym:

```
$ git push
```

Jeśli PR jest już otwarty, nowy commit sam się w nim pojawi. Nie trzeba
zakładać nowego PR-a. Tak trafiła na GitHub ta aktualizacja dziennika.

---

## Krok 5 ✅ - pierwszy pull request (#1)

### 5.1 Otwarcie PR-a (w przeglądarce)

1. Otwórz link z kroku 4.3 (albo na stronie repo kliknij żółty pasek
   **Compare & pull request**).
2. Sprawdź kierunek: **base: `main`** ← **compare: `feat/instrument`**.
   Strzałka pokazuje, dokąd płyną zmiany: z gałęzi do `main`.
3. **Tytuł:** co wchodzi (`Stage 1: the instrument`). **Opis:** lista
   zmian i **jak to sprawdzić** (polecenia i co kliknąć). Opis PR-a czyta
   ktoś, kto nie siedział z tobą przy kodzie, łącznie z tobą za pół roku.
4. **Create pull request.** PR dostaje numer (`#1`), który zostaje na
   zawsze, razem z dyskusją i diffem.

### 5.2 Przeczytaj własny diff

Zakładka **Files changed**: każdy zmieniony plik, na zielono linie dodane,
na czerwono usunięte. Czytaj jak recenzent:

- czy nie wpadło nic przypadkowego (pliki tymczasowe, logi, `.env`);
- czy każda zmiana pasuje do tytułu PR-a;
- czy nie zostało nic „na chwilę” (zakomentowany kod, `console.log`).

Kliknięcie **+** przy linii pozwala dodać komentarz, nawet we własnym PR-ze
(notatka dla siebie albo pytanie).

### 5.3 Merge (w przeglądarce)

Przycisk **Merge pull request** ma strzałkę ▾ z trzema sposobami:

| opcja | co robi z commitami gałęzi | kiedy |
|---|---|---|
| **Create a merge commit** | zostawia wszystkie i dodaje commit „Merge pull request #N” | chcesz zachować pełną historię pracy |
| **Squash and merge** | zgniata wszystkie w jeden nowy commit | gałąź ma dużo drobnych „fix”, „wip” |
| **Rebase and merge** | dokleja je na koniec `main` z nowymi hashami | chcesz liniowej historii bez commita merge |

Tu użyto **Create a merge commit** → **Confirm merge**, potem przycisk
**Delete branch** (usuwa gałąź na GitHubie; PR zachowuje jej historię).

### 5.4 Ściągnięcie merge'a do siebie

Merge powstał na GitHubie, więc lokalny `main` jeszcze go nie ma:

```
$ git switch main
Switched to branch 'main'
Your branch is up to date with 'origin/main'.
```

> **Pułapka:** „up to date” **kłamie**. Git porównuje się z tym, co
> **ostatnio pobrał** z GitHuba, nie z tym, co jest tam teraz. O merge'u
> jeszcze nie wie. `git fetch` (albo `pull`) odświeża tę wiedzę.

```
$ git pull
From github.com:RobiSolutions/bench-scope
   76ed258..83be2a2  main       -> origin/main
Updating 76ed258..83be2a2
Fast-forward
 README.md                        |   7 +-
 docs/git-krok-po-kroku.md        | 445 +++++++++++++++++++++++++++++++++++++++
 ...
 11 files changed, 1368 insertions(+), 3 deletions(-)
```

`Fast-forward` oznacza, że lokalny `main` nie miał nic własnego, więc Git
tylko przesunął etykietę do przodu, bez łączenia czegokolwiek.

### 5.5 Sprzątanie

Gałąź lokalna (`-d` usuwa tylko gałąź już scaloną; niescaloną Git
odmówi, i dobrze):

```
$ git branch -d feat/instrument
Deleted branch feat/instrument (was df36d63).
```

Etykieta `origin/feat/instrument`: gałęzi na GitHubie już nie ma (przycisk
Delete branch), ale lokalna kopia etykiety została. `--prune` ją usuwa:

```
$ git fetch --prune
From github.com:RobiSolutions/bench-scope
 - [deleted]         (none)     -> origin/feat/instrument
```

> Jeśli nie kliknąłeś Delete branch na GitHubie, usuń gałąź zdalną z
> terminala: `git push origin --delete feat/instrument`.

### 5.6 Sprawdzenie

```
$ git branch -a
* main
  remotes/origin/main

$ git log --oneline --graph --all --decorate
*   83be2a2 (HEAD -> main, origin/main) Merge pull request #1 from RobiSolutions/feat/instrument
|\
| * df36d63 Journal: the repository on GitHub and the first push
| * ec50bdc A step-by-step git journal, in Polish
| * fe07108 The instrument: a screen that holds a trace still
|/
* 76ed258 The core before the pixels: waveforms and a trigger that holds still

$ npm test
      Tests  36 passed (36)
```

Wykres pokazuje całą drogę: gałąź odeszła od `76ed258`, dostała trzy
commity i wróciła przez commit merge `83be2a2`. Etykiety `feat/instrument`
już nie ma, ale jej commity zostały w historii `main`.

---

## Krok 6 ⏳ - ta aktualizacja dziennika jako PR #2

Od teraz nic nie trafia bezpośrednio do `main`, nawet dokumentacja:

```
$ git switch -c docs/journal-first-pr
$ git add docs/git-krok-po-kroku.md
$ git commit -m "Journal: the first pull request, merge and cleanup"
$ git push -u origin docs/journal-first-pr
```

Dalej samodzielnie, według kroku 5: PR, diff, merge, `pull`, sprzątanie.

---

## Ściąga: codzienny cykl

```
$ git switch main && git pull              # start od aktualnego main
$ git switch -c feat/nazwa                 # nowa gałąź na nową rzecz
  ...praca...
$ git status                               # co się zmieniło
$ git add PLIKI
$ git commit -m "co i po co"
$ git push -u origin feat/nazwa            # pierwszy push gałęzi
$ git push                                 # kolejne
  → PR na GitHubie → merge → wróć do pierwszej linii
```
