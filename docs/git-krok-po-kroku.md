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
(twój adres do commitów)
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

**Problem:** gdy na jednym komputerze masz kilka kluczy SSH do różnych
kont GitHuba, SSH bez wskazania klucza bierze ten, który agent poda
pierwszy. Dziś może trafić we właściwe konto, ale po restarcie albo
dodaniu klucza do agenta w innej kolejności push pójdzie na inne konto i
zostanie odrzucony („Permission denied” / „Repository not found”).

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
   awatar w prawym górnym rogu, żeby nie założyć repo na innym koncie.
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

> Ten sam błąd zobaczysz, gdy SSH zaloguje cię na **inne konto** - dla GitHuba cudze prywatne repo „nie istnieje”. Wtedy wróć do
> kroku 1b.

**Obok, w ustawieniach konta (Settings → Emails):** adres, którym
podpisane są commity (`git config user.email`), musi być na liście
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

## Krok 6 ✅ - szybka ścieżka: merge z terminala, bez PR-a

Aktualizacja dziennika (krok 5) powstała **po** merge'u PR #1, więc
potrzebowała własnej drogi do `main`. Zamiast drugiego PR-a scalono ją z
terminala.

**Kiedy wolno:** drobna zmiana, której nikt nie musi recenzować (tu: sama
dokumentacja), i brak ochrony gałęzi `main`. Gdy włączymy branch
protection, ta ścieżka przestanie działać, i o to chodzi.

**Czego się nie ma:** PR-a z numerem, dyskusją i przebiegiem CI dla tej
zmiany. W historii zostaje tylko sam commit.

### 6.1 Gałąź, commit, push (jak zawsze)

```
$ git switch -c docs/journal-first-pr
Switched to a new branch 'docs/journal-first-pr'
$ git add docs/git-krok-po-kroku.md
$ git commit -m "Journal: the first pull request, merge and cleanup"
$ git push -u origin docs/journal-first-pr
 * [new branch]      docs/journal-first-pr -> docs/journal-first-pr
```

### 6.2 Merge do `main` lokalnie

```
$ git switch main
Switched to branch 'main'
Your branch is up to date with 'origin/main'.

$ git merge --ff-only docs/journal-first-pr
Updating 83be2a2..eed7179
Fast-forward
 docs/git-krok-po-kroku.md | 138 +++++++++++++++++++++++++++++++++++++++++-----
 1 file changed, 124 insertions(+), 14 deletions(-)
```

`--ff-only` to bezpiecznik: Git scali tylko wtedy, gdy wystarczy
przesunąć etykietę `main` do przodu (fast-forward). Jeśli w międzyczasie
na `main` pojawiło się coś, czego gałąź nie ma, Git odmówi zamiast po
cichu tworzyć commit merge. Wtedy najpierw `git pull`, potem ponownie.

### 6.3 Wypchnij `main`

```
$ git push
To github.com:RobiSolutions/bench-scope.git
   83be2a2..eed7179  main -> main
```

`83be2a2..eed7179` znaczy: `main` na GitHubie przesunął się z tego commita
na ten.

### 6.4 Sprzątanie, tym razem wszystko z terminala

```
$ git branch -d docs/journal-first-pr
Deleted branch docs/journal-first-pr (was eed7179).

$ git push origin --delete docs/journal-first-pr
To github.com:RobiSolutions/bench-scope.git
 - [deleted]         docs/journal-first-pr
```

Usunięcie gałęzi zdalnym pushem od razu usuwa też lokalną etykietę
`origin/docs/journal-first-pr`, więc `fetch --prune` nie jest potrzebny.

### 6.5 Sprawdzenie

```
$ git log --oneline --graph --all --decorate
* eed7179 (HEAD -> main, origin/main) Journal: the first pull request, merge and cleanup
*   83be2a2 Merge pull request #1 from RobiSolutions/feat/instrument
|\
| * df36d63 Journal: the repository on GitHub and the first push
| * ec50bdc A step-by-step git journal, in Polish
| * fe07108 The instrument: a screen that holds a trace still
|/
* 76ed258 The core before the pixels: waveforms and a trigger that holds still
```

Widać różnicę między dwiema ścieżkami: PR #1 zostawił commit merge i
„bąbel” gałęzi, a fast-forward to po prostu kolejny commit na prostej
linii.

### 6.6 Ten opis

Opis kroku 6 nie mógł powstać przed samym krokiem, więc trafił do `main`
osobnym commitem, bezpośrednio (`git commit` na `main`, potem `git push`).
To ta sama szybka ścieżka, tylko bez gałęzi.

---

## Krok 7 ✅ - CI i automatyczna publikacja (gałąź `ci/deploy`)

**CI** (continuous integration) to testy i build uruchamiane
automatycznie przez GitHuba przy każdym PR-ze. **Deploy** to automatyczna
publikacja strony po każdym merge'u do `main`. Obie rzeczy robi
**GitHub Actions**: usługa, która na serwerach GitHuba wykonuje polecenia
opisane w plikach YAML z repozytorium.

### 7.1 Gdzie te pliki powstają, a gdzie działają

To najczęstsze nieporozumienie, więc na początek: **żaden z tych plików
nie powstaje na GitHubie.** Tworzy się je lokalnie, w edytorze, jak każdy
inny plik projektu, a potem commituje i pushuje. GitHub tylko je czyta.

```
TWÓJ KOMPUTER                                    GITHUB
─────────────                                    ──────
edytor: tworzysz pliki
  .github/workflows/ci.yml
  .github/workflows/deploy.yml
  vite.config.ts
  .node-version
        │
   git add / git commit       (zapis lokalny)
        │
   git push  ─────────────────────────────────►  repo na GitHubie ma te pliki
                                                        │
                                  GitHub zauważa folder .github/workflows/
                                  i sam uruchamia opisane tam zadania
                                  na swoim serwerze („runner”, czysta
                                  maszyna z Ubuntu, kasowana po każdym
                                  uruchomieniu)
                                                        │
                                  wynik: ✓ / ✗ przy PR-ze, zakładka Actions,
                                  strona na GitHub Pages
```

| plik | kto go czyta | gdzie działa |
|---|---|---|
| `.github/workflows/ci.yml` | GitHub Actions | na serwerze GitHuba, przy każdym PR-ze i pushu na `main` |
| `.github/workflows/deploy.yml` | GitHub Actions | na serwerze GitHuba, po każdym pushu na `main` (czyli po merge'u) |
| `vite.config.ts` | Vite (narzędzie budujące) | **wszędzie tam, gdzie uruchamiasz Vite**: u ciebie (`npm run dev`, `npm run build`) i w CI |
| `.node-version` | fnm u ciebie, `setup-node` w CI | u ciebie i na serwerze GitHuba |

Nazwa i miejsce folderu `.github/workflows/` są obowiązkowe: GitHub szuka
workflowów **tylko** tam. Nazwa samego pliku (`ci.yml`, `deploy.yml`) jest
dowolna. Kropka na początku `.github` oznacza folder ukryty; w terminalu
zobaczysz go przez `ls -a`.

> Pliki workflowów da się też utworzyć w przeglądarce (zakładka
> **Actions** → gotowe szablony). GitHub robi wtedy commit na zdalnym repo,
> więc lokalnie trzeba potem zrobić `git pull`. Tu zrobiliśmy to lokalnie,
> żeby wszystko przeszło przez zwykłą drogę: gałąź, PR, review.

### 7.2 Aktualizacja Node i `.node-version`

**Problem:** lokalnie działał Node 18 (systemowy, z `apt`), który nie ma
już wsparcia, a CI miało używać Node 24. Różne wersje w terminalu i w CI
to przepis na błędy typu „u mnie działa”.

Na komputerze był już zainstalowany **fnm** (menedżer wersji Node: trzyma
kilka wersji obok siebie i przełącza między nimi), ale bez ustawionej
wersji domyślnej, więc wygrywał systemowy Node.

```
$ fnm list
* v20.20.1
* v24.14.0
* system                       ← to było używane

$ fnm install 24               # najnowsze 24.x
$ fnm default 24               # domyślna wersja w każdym nowym terminalu
$ fnm list
* v20.20.1
* v24.14.0
* v24.21.0 default
* system

$ node --version
v24.21.0
```

> Terminal otwarty **przed** tą zmianą dalej pokazuje starą wersję.
> Otwórz nowy albo wpisz `fnm use 24`.

Plik **`.node-version`** w katalogu projektu zawiera jedną linię:

```
24
```

Czytają go dwa narzędzia: fnm (`fnm use` bez numeru wybiera tę wersję) i
akcja `setup-node` w obu workflowach. Jedno źródło prawdy: zmiana wersji
Node to zmiana jednego pliku, a nie trzech.

Po zmianie Node warto zainstalować zależności od zera i sprawdzić projekt:

```
$ rm -rf node_modules
$ npm ci
$ npm test
      Tests  36 passed (36)
$ npm run build
✓ built in 166ms
```

`npm ci` (a nie `npm install`) instaluje **dokładnie** wersje z
`package-lock.json` i niczego w nim nie zmienia; tego samego polecenia
używa CI.

> npm 11 wypisze ostrzeżenie `install-scripts` dla `esbuild`. Nowy npm
> domyślnie nie uruchamia skryptów instalacyjnych pakietów (ochrona przed
> złośliwymi paczkami). Skrypt esbuilda tylko sprawdza plik binarny, który
> i tak przychodzi osobnym pakietem, więc build działa bez niego.

### 7.3 `vite.config.ts` - konfiguracja budowania

**Co to jest:** plik konfiguracyjny Vite, narzędzia, które uruchamia
serwer deweloperski (`npm run dev`) i buduje gotową stronę do folderu
`dist/` (`npm run build`). Bez tego pliku Vite działa na ustawieniach
domyślnych; plik zmienia tylko to, co w nim wpisane.

```ts
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
});
```

**Po co `base: './'`:** strona na GitHub Pages nie leży w głównym katalogu
domeny, tylko w podfolderze nazwanym jak repo:

```
https://robisolutions.github.io/bench-scope/
                                └── podfolder
```

Domyślnie Vite wpisuje do zbudowanego `index.html` ścieżki **od korzenia
domeny**, które w podfolderze prowadzą donikąd:

```html
<script src="/assets/index-XXXX.js">       ← szuka robisolutions.github.io/assets/... → 404
```

Z `base: './'` ścieżki są **względne**, czyli liczone od miejsca, gdzie
leży `index.html`:

```html
<script src="./assets/index-XXXX.js">      ← robisolutions.github.io/bench-scope/assets/... ✓
```

Sprawdzenie po buildzie:

```
$ npm run build
$ grep -oE '(src|href)="[^"]+"' dist/index.html
src="./assets/index-BXrx9F8t.js"
href="./assets/index-DYfk8tk2.css"
```

Zaleta względnych ścieżek: build działa pod każdym adresem, także po
zmianie nazwy repo, i nigdzie nie trzeba wpisywać `bench-scope`.

### 7.4 `.github/workflows/ci.yml` - testy przy każdym PR-ze

```yaml
name: CI                         # nazwa widoczna w zakładce Actions i przy PR-ze

on:                              # KIEDY uruchomić
  pull_request:                  #   przy każdym PR-ze (i każdym nowym commicie w nim)
  push:
    branches: [main]             #   przy każdym pushu na main (np. po merge'u)

jobs:                            # CO uruchomić: lista zadań
  test:                          # nazwa zadania (przy PR-ze: „CI / test”)
    runs-on: ubuntu-latest       # na jakiej maszynie: świeży Ubuntu od GitHuba
    steps:                       # kroki, po kolei; błąd w jednym przerywa resztę
      - uses: actions/checkout@v7          # pobiera kod repo na maszynę
      - uses: actions/setup-node@v7        # instaluje Node
        with:
          node-version-file: .node-version #   w wersji z pliku .node-version
          cache: npm                       #   i zapamiętuje pobrane paczki na następny raz
      - run: npm ci              # instaluje zależności z package-lock.json
      - run: npm test            # testy; jeden nieudany = czerwony ✗
      - run: npm run build       # typy + build; błąd typów = czerwony ✗
```

Dwa rodzaje kroków:

- **`uses:`** to gotowa akcja z innego repo na GitHubie
  (`actions/checkout` to repo `github.com/actions/checkout`), a `@v7` to
  jej wersja. Wersje sprawdzono poleceniem
  `git ls-remote --tags https://github.com/actions/checkout.git`,
  bo z pamięci łatwo wpisać nieaktualną.
- **`run:`** to zwykłe polecenie terminala, takie samo jak u ciebie.

Maszyna jest za każdym razem **pusta**: nie ma twojego `node_modules`,
plików spoza repo ani ustawień z `~/.bashrc`. Jeśli coś działa u ciebie, a
w CI nie, najczęściej przyczyną jest plik niedodany do commita albo
zależność od czegoś zainstalowanego tylko lokalnie. To jest główna wartość
CI: sprawdza projekt tak, jak zobaczy go ktoś inny.

### 7.5 `.github/workflows/deploy.yml` - publikacja po merge'u

```yaml
name: Deploy

on:
  push:
    branches: [main]             # tylko po zmianie na main, nie przy PR-ach
  workflow_dispatch:             # plus przycisk „Run workflow” w zakładce Actions

permissions:                     # co workflow może zrobić w twoim repo
  contents: read                 #   czytać kod
  pages: write                   #   publikować na GitHub Pages
  id-token: write                #   potwierdzić tożsamość przy publikacji

concurrency:                     # jedna publikacja naraz
  group: pages
  cancel-in-progress: false      # nowsza czeka w kolejce, zamiast przerywać bieżącą

jobs:
  build:                         # zadanie 1: zbuduj stronę
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version-file: .node-version
          cache: npm
      - run: npm ci
      - run: npm test            # nie publikuj niczego, co nie przechodzi testów
      - run: npm run build       # wynik ląduje w dist/
      - uses: actions/configure-pages@v6        # przygotowuje ustawienia Pages
      - uses: actions/upload-pages-artifact@v5  # pakuje dist/ do wysłania
        with:
          path: dist

  deploy:                        # zadanie 2: opublikuj
    needs: build                 # dopiero gdy build się udał
    runs-on: ubuntu-latest
    environment:                 # „środowisko” widoczne w repo jako github-pages,
      name: github-pages         #   z historią wszystkich publikacji
      url: ${{ steps.deployment.outputs.page_url }}   # adres strony, pokazany w Actions
    steps:
      - id: deployment
        uses: actions/deploy-pages@v5           # wysyła paczkę na GitHub Pages
```

**`permissions`:** bez tej sekcji workflow dostaje uprawnienia domyślne z
ustawień repo (Settings → Actions → General), które dla publikacji na
Pages nie wystarczą. Gdy sekcja jest, workflow ma **tylko** to, co w niej
wypisane, a wszystko inne jest zablokowane. Workflow z błędem albo z
podmienioną akcją może więc zrobić tylko tyle, na ile mu pozwolono.

**Dwa zadania zamiast jednego:** build nie potrzebuje uprawnień do
publikacji, a publikacja nie potrzebuje kodu. `needs: build` gwarantuje, że
nieudany build nigdy niczego nie opublikuje.

**`${{ ... }}`:** wyrażenie, które GitHub wylicza w trakcie działania;
tu podstawia adres strony zwrócony przez krok `deployment`.

### 7.6 Jednorazowe ustawienie Pages (w przeglądarce)

Workflow sam nie włączy GitHub Pages; trzeba to zrobić raz, **przed**
pierwszym deployem, inaczej zadanie `deploy` zakończy się błędem:

1. Repo na GitHubie → **Settings** → w menu po lewej **Pages**.
2. **Build and deployment** → **Source:** wybierz **GitHub Actions**
   (nie *Deploy from a branch*).
3. Nic więcej nie trzeba zapisywać; ustawienie działa od razu.

*Deploy from a branch* to starszy sposób: GitHub publikuje pliki z
wybranej gałęzi tak, jak leżą. Tu strona wymaga zbudowania (TypeScript →
JavaScript), więc publikuje ją workflow.

### 7.7 Commity na gałęzi `ci/deploy`

```
$ git switch -c ci/deploy
$ git add vite.config.ts .github/
$ git commit -m "CI on every pull request, Pages on every merge"
$ git push -u origin ci/deploy

$ git add .node-version .github/workflows
$ git commit -m "One Node version for the terminal and for CI"
$ git push
```

Uwaga: samo wypchnięcie gałęzi **nie** uruchamia CI, bo `ci.yml` reaguje
na PR-y i na `main`, a nie na każdą gałąź. Pierwszy przebieg ruszy po
otwarciu PR-a.

### 7.8 PR #2: zielony check, squash, pierwsza publikacja

**Kolejność ma znaczenie:** najpierw Settings → Pages → Source: GitHub
Actions (7.6), dopiero potem PR i merge.

> **Pułapka w ustawieniach Pages:** po wybraniu *GitHub Actions* GitHub
> proponuje gotowe workflowy (*Static HTML*, *Jekyll*) z przyciskiem
> **Configure**. Nie klikaj: utworzyłby drugi plik deploy commitem prosto
> na `main`, z pominięciem PR-a, i dublowałby `deploy.yml`.

**Checki w PR-ze.** Po otwarciu PR-a na dole zakładki Conversation:

```
All checks have passed
1 successful check
CI / test (pull_request)   Successful in 16s
No conflicts with base branch
```

`CI / test` = nazwa workflowu (`name: CI`) / nazwa joba (`test:`), a w
nawiasie zdarzenie, które go uruchomiło. **Details** pokazuje log każdego
kroku: checkout, setup-node, npm ci, npm test, npm run build.

W podsumowaniu przebiegu może pojawić się **adnotacja** (notice): tu
GitHub uprzedzał, że etykieta `ubuntu-latest` przejdzie na nowszy
Ubuntu. To informacja, nie błąd; warto je czytać, bo tak GitHub zapowiada
zmiany, które kiedyś mogą coś zepsuć.

**Merge: tym razem Squash and merge.** Cztery commity z gałęzi zamieniły
się w jeden nowy commit na `main`, z numerem PR-a w tytule:

```
* 1aaef76 (HEAD -> main, origin/main) CI and Pages deploy (#2)
* 8a007c8 Journal: keep it free of account details
```

Porównaj z PR #1 (merge commit, „bąbel” w wykresie): po squashu historia
`main` jest prosta, a pojedyncze commity z gałęzi zostają widoczne tylko w
PR-ze na GitHubie.

**Zakładka Actions po merge'u** - trzy przebiegi:

```
CI #1       Pull request #2 opened      ci/deploy   19s   ← checki w PR-ze
CI #2       Commit 1aaef76 pushed       main        19s   ← merge to push na main
Deploy #1   Commit 1aaef76 pushed       main        58s   ← publikacja
```

Merge na GitHubie to z punktu widzenia workflowów zwykły **push na
`main`**, dlatego ruszyły oba workflowy z `on: push: branches: [main]`,
i to równolegle. Deploy to dwa joby po kolei (`needs: build`):

```
build    18s   testy, build, spakowanie dist/
deploy   31s   publikacja na Pages
```

Strona: <https://robisolutions.github.io/bench-scope/>

### 7.9 Synchronizacja i sprzątanie po squashu

```
$ git switch main
$ git pull
From github.com:RobiSolutions/bench-scope
   8a007c8..1aaef76  main       -> origin/main
Updating 8a007c8..1aaef76
Fast-forward

$ git branch -d ci/deploy
warning: deleting branch 'ci/deploy' that has been merged to
         'refs/remotes/origin/ci/deploy', but not yet merged to HEAD
Deleted branch ci/deploy (was 94d2dd1).
```

**Co tu się stało:** squash stworzył na `main` **nowy** commit, więc z
punktu widzenia Gita commity gałęzi `ci/deploy` nie są w `main`. `-d`
normalnie odmówiłby (`not fully merged`). Tu przepuścił z ostrzeżeniem,
bo lokalna etykieta `origin/ci/deploy` jeszcze istniała i zawierała te
same commity - Git uznał, że nic nie przepadnie.

Gdyby najpierw zrobić `git fetch --prune` (etykieta zdalna znika), `-d`
by odmówił. Wtedy, **po upewnieniu się, że PR jest scalony**:

```
$ git branch -D ci/deploy          # wielkie D = usuń mimo to
```

Na koniec:

```
$ git fetch --prune
 - [deleted]         (none)     -> origin/ci/deploy
$ git branch -a
* main
  remotes/origin/main
```

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
