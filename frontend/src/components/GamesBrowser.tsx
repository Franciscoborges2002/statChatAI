import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronRight, Loader2, Locate, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { getGames, getSeasonGames } from "../api";
import type { CompetitionGroup, GameSummary } from "../types";

interface Props {
  open: boolean;
  onClose: () => void;
  activeMatchId: number | null;
  activeCompetitionId: number | null;
  activeSeasonId: number | null;
  switchingMatchId: number | null;
  onSelect: (competitionId: number, seasonId: number, matchId: number) => void;
}

export function GamesBrowser({
  open,
  onClose,
  activeMatchId,
  activeCompetitionId,
  activeSeasonId,
  switchingMatchId,
  onSelect,
}: Props) {
  const [groups, setGroups] = useState<CompetitionGroup[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [openCompetitionId, setOpenCompetitionId] = useState<number | null>(null);
  const [openSeason, setOpenSeason] = useState<string | null>(null);
  const [games, setGames] = useState<Record<string, GameSummary[]>>({});
  const [seasonLoading, setSeasonLoading] = useState<string | null>(null);
  const [seasonError, setSeasonError] = useState<string | null>(null);
  const [autoExpanded, setAutoExpanded] = useState(false);
  const groupRefs = useRef<Map<number, HTMLButtonElement>>(new Map());

  useEffect(() => {
    if (!open || groups) return;
    getGames()
      .then(setGroups)
      .catch(() => setError("Couldn't load the games catalog — is the backend running?"));
  }, [open, groups]);

  // Whenever the active match changes, let the drawer re-reveal it next time it's opened.
  useEffect(() => {
    setAutoExpanded(false);
  }, [activeMatchId]);

  async function fetchSeason(competitionId: number, seasonId: number) {
    const key = `${competitionId}-${seasonId}`;
    if (games[key]) return;
    setSeasonError(null);
    setSeasonLoading(key);
    try {
      const items = await getSeasonGames(competitionId, seasonId);
      setGames((prev) => ({ ...prev, [key]: items }));
    } catch {
      setSeasonError("Couldn't load this season's games.");
    } finally {
      setSeasonLoading(null);
    }
  }

  function toggleSeason(competitionId: number, seasonId: number) {
    const key = `${competitionId}-${seasonId}`;
    setOpenSeason((prev) => (prev === key ? null : key));
    fetchSeason(competitionId, seasonId);
  }

  function revealActiveMatch() {
    if (activeCompetitionId == null || activeSeasonId == null) return;
    setQuery("");
    setOpenCompetitionId(activeCompetitionId);
    setOpenSeason(`${activeCompetitionId}-${activeSeasonId}`);
    fetchSeason(activeCompetitionId, activeSeasonId);
    window.setTimeout(() => {
      groupRefs.current.get(activeCompetitionId)?.scrollIntoView({ block: "center", behavior: "smooth" });
    }, 200);
  }

  // Reveal the currently loaded match the first time the drawer opens after a switch.
  useEffect(() => {
    if (!open || autoExpanded || !groups || activeCompetitionId == null || activeSeasonId == null) {
      return;
    }
    setAutoExpanded(true);
    revealActiveMatch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, autoExpanded, groups, activeCompetitionId, activeSeasonId]);

  const filteredGroups = useMemo(() => {
    if (!groups) return groups;
    const q = query.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter(
      (g) =>
        g.competition_name.toLowerCase().includes(q) ||
        (g.country_name?.toLowerCase().includes(q) ?? false)
    );
  }, [groups, query]);

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full gap-0 sm:max-w-md">
        <SheetHeader className="border-b">
          <SheetTitle>Available games</SheetTitle>
          <SheetDescription>StatsBomb open data · grouped by competition</SheetDescription>
        </SheetHeader>
        {groups && groups.length > 0 && (
          <div className="flex items-center gap-2 border-b px-3 py-2.5">
            <div className="relative flex-1">
              <Search
                className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filter competitions or countries…"
                aria-label="Filter competitions"
                className="h-8 pl-8 text-sm"
              />
            </div>
            {activeCompetitionId != null && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 shrink-0 gap-1 text-xs"
                onClick={revealActiveMatch}
              >
                <Locate className="size-3.5" aria-hidden="true" />
                Current
              </Button>
            )}
          </div>
        )}
        <ScrollArea className="min-h-0 flex-1">
          <div className="px-3 pb-4">
            {!groups && !error && (
              <div className="flex flex-col gap-2 p-2" aria-label="Loading games">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-9 w-full" />
                ))}
              </div>
            )}
            {error && <p className="p-3 text-sm text-muted-foreground">{error}</p>}
            {filteredGroups && filteredGroups.length === 0 && (
              <p className="p-3 text-sm text-muted-foreground">
                No competitions match "{query}".
              </p>
            )}
            {filteredGroups?.map((group) => (
              <Collapsible
                key={group.competition_id}
                open={openCompetitionId === group.competition_id}
                onOpenChange={(v) => setOpenCompetitionId(v ? group.competition_id : null)}
                className="border-b last:border-b-0"
              >
                <CollapsibleTrigger
                  asChild
                  ref={(el) => {
                    if (el) groupRefs.current.set(group.competition_id, el);
                    else groupRefs.current.delete(group.competition_id);
                  }}
                >
                  <Button
                    variant="ghost"
                    className="group h-auto w-full justify-start gap-2 px-2 py-2.5 text-left text-sm font-normal"
                  >
                  <ChevronRight
                    className="size-3.5 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-90 motion-reduce:transition-none"
                    aria-hidden="true"
                  />
                  <span className="font-semibold">{group.competition_name}</span>
                  {group.country_name && (
                    <span className="text-xs text-muted-foreground">{group.country_name}</span>
                  )}
                  {group.competition_id === activeCompetitionId && (
                    <span
                      className="size-1.5 shrink-0 rounded-full bg-primary"
                      aria-label="Contains the loaded match"
                    />
                  )}
                  <span className="ml-auto text-[11px] text-muted-foreground">
                    {group.seasons.length} season{group.seasons.length === 1 ? "" : "s"}
                  </span>
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-top-1 motion-reduce:animate-none">
                  {group.seasons.map((season) => {
                    const key = `${group.competition_id}-${season.season_id}`;
                    const seasonOpen = openSeason === key;
                    const isActiveSeason =
                      group.competition_id === activeCompetitionId && season.season_id === activeSeasonId;
                    return (
                      <div key={season.season_id} className="ml-4">
                        <Button
                          variant="ghost"
                          className="h-auto w-full justify-start gap-2 px-2 py-1.5 text-left text-[13px] font-normal text-muted-foreground hover:text-foreground"
                          aria-expanded={seasonOpen}
                          onClick={() => toggleSeason(group.competition_id, season.season_id)}
                        >
                          <ChevronRight
                            className={cn(
                              "size-3 shrink-0 transition-transform duration-200 motion-reduce:transition-none",
                              seasonOpen && "rotate-90"
                            )}
                            aria-hidden="true"
                          />
                          {season.season_name}
                          {isActiveSeason && (
                            <span className="size-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                          )}
                        </Button>
                        {seasonOpen && (
                          <div className="mb-2 ml-5 flex flex-col gap-0.5">
                            {seasonLoading === key &&
                              Array.from({ length: 4 }).map((_, i) => (
                                <Skeleton key={i} className="h-7 w-full" />
                              ))}
                            {seasonError && seasonLoading !== key && !games[key] && (
                              <p className="px-2 py-1 text-xs text-muted-foreground">{seasonError}</p>
                            )}
                            {games[key]?.map((game) => {
                              const isActive = game.match_id === activeMatchId;
                              const isSwitching = game.match_id === switchingMatchId;
                              const isBlocked = !isActive && switchingMatchId !== null;
                              return (
                                <Button
                                  key={game.match_id}
                                  variant="ghost"
                                  className={cn(
                                    "h-auto w-full flex-wrap items-baseline justify-start gap-x-1.5 gap-y-0 whitespace-normal border border-transparent px-2 py-1.5 text-left text-xs font-normal",
                                    isActive
                                      ? "border-primary bg-accent disabled:opacity-100"
                                      : "hover:border-border",
                                    isBlocked && "pointer-events-none opacity-50"
                                  )}
                                  disabled={isActive || switchingMatchId !== null}
                                  onClick={() =>
                                    onSelect(group.competition_id, season.season_id, game.match_id)
                                  }
                                >
                                  <span className="shrink-0 tabular-nums text-muted-foreground">
                                    {game.match_date}
                                  </span>
                                  <span>
                                    {game.home_team} {game.home_score}–{game.away_score}{" "}
                                    {game.away_team}
                                  </span>
                                  {game.stage && (
                                    <span className="text-[11px] text-muted-foreground">
                                      {game.stage}
                                    </span>
                                  )}
                                  {isActive && <Badge className="text-[10px]">Loaded</Badge>}
                                  {isSwitching && (
                                    <Badge className="gap-1 text-[10px]">
                                      <Loader2 className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
                                      Loading…
                                    </Badge>
                                  )}
                                </Button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
