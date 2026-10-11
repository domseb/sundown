import "./styles.css";
import '@radix-ui/themes/styles.css';
import { Theme, Dialog, IconButton, Button, TextField, DropdownMenu } from '@radix-ui/themes';
import { useState, useEffect, useCallback } from "react";
import { GearIcon, PlusIcon, TrashIcon, DotsVerticalIcon } from "@radix-ui/react-icons";
import Section from "./Section";
import SundownLogo from "./sundown-logo.svg";
import { fetchSwimlanes, saveSwimlanes, loadSwimlanesFromStorage, loadBlocksFromStorage } from "./Api";
import {
  getWeekAheadMonday,
  readDisplayedMonday,
  rememberDisplayedMonday,
} from "./dayWeather";
import WeekBalance from "./WeekBalance";
import { keepsAfterSunset, presentBlock } from "./activityTypes";

const DEFAULT_SWIMLANES = [
  { id: 'sl-1', start: '05:00', end: '07:00' },
  { id: 'sl-2', start: '09:00', end: '12:00' },
  { id: 'sl-3', start: '12:00', end: '13:00' },
  { id: 'sl-4', start: '13:00', end: '17:00' },
  { id: 'sl-5', start: '19:00', end: '22:00' },
];

export default function App() {
  const [initialSwimlaneState] = useState(() => {
    const stored = loadSwimlanesFromStorage();
    return {
      swimlanes: stored ?? DEFAULT_SWIMLANES,
      ready: stored != null,
    };
  });
  const [swimlanes, setSwimlanes] = useState(initialSwimlaneState.swimlanes);
  const [swimlanesReady, setSwimlanesReady] = useState(initialSwimlaneState.ready);
  const [swimlanesHydrated, setSwimlanesHydrated] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [clearBoardSignal, setClearBoardSignal] = useState(0);
  const [sunsetOpen, setSunsetOpen] = useState(false);
  const [sunsetSignal, setSunsetSignal] = useState(0);
  const [weekMonday, setWeekMonday] = useState(readDisplayedMonday);
  const [forecastRefresh, setForecastRefresh] = useState(0);
  const [chartBlocks, setChartBlocks] = useState(() => loadBlocksFromStorage() || []);
  const handleBlocksChange = useCallback((nextBlocks) => {
    setChartBlocks(nextBlocks || []);
  }, []);

  useEffect(() => {
    let cancelled = false;

    fetchSwimlanes()
      .then((data) => {
        if (!cancelled && data?.length > 0) {
          setSwimlanes(data);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setSwimlanesReady(true);
          setSwimlanesHydrated(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!swimlanesHydrated) return;

    const timer = setTimeout(() => {
      saveSwimlanes(swimlanes).catch((error) =>
        console.error("Error saving swimlanes:", error)
      );
    }, 400);

    return () => clearTimeout(timer);
  }, [swimlanes, swimlanesHydrated]);

  const addSwimlane = () => {
    setSwimlanes((prev) => [
      ...prev,
      { id: 'sl-' + Date.now(), start: '09:00', end: '12:00' },
    ]);
  };

  const updateSwimlane = (id, field, value) => {
    setSwimlanes((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [field]: value } : s))
    );
  };

  const removeSwimlane = (id) => {
    setSwimlanes((prev) => prev.filter((s) => s.id !== id));
  };

  const keptAfterSunset = chartBlocks.filter(keepsAfterSunset);

  const confirmSunset = () => {
    const nextMonday = getWeekAheadMonday();
    rememberDisplayedMonday(nextMonday);
    setWeekMonday(nextMonday);
    setForecastRefresh((n) => n + 1);
    setSunsetSignal((n) => n + 1);
    setSunsetOpen(false);
  };

  return (
    <div className="App">
      <Theme>
        <div className="app-layout">
          <header className="app-header">
            <WeekBalance blocks={chartBlocks} swimlanes={swimlanes} />
            <img src={SundownLogo} alt="Sundown" className="app-logo" />
            <div className="app-header-settings">
              <button type="button" className="sunset-week" onClick={() => setSunsetOpen(true)}>
                sunset the week
              </button>
              <DropdownMenu.Root>
                <DropdownMenu.Trigger>
                  <IconButton
                    size="3"
                    variant="ghost"
                    aria-label="Open menu"
                    title="Menu"
                  >
                    <DotsVerticalIcon width="20" height="20" />
                  </IconButton>
                </DropdownMenu.Trigger>
                <DropdownMenu.Content align="end">
                  <DropdownMenu.Item onSelect={() => setSettingsOpen(true)}>
                    <GearIcon width="16" height="16" />
                    Row settings
                  </DropdownMenu.Item>
                  <DropdownMenu.Item
                    color="red"
                    onSelect={() => setClearBoardSignal((n) => n + 1)}
                  >
                    <TrashIcon width="16" height="16" />
                    Clear board
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Root>
            </div>
          </header>

          {swimlanesReady && (
            <Section
              swimlanes={swimlanes}
              onSwimlaneChange={updateSwimlane}
              clearBoardSignal={clearBoardSignal}
              sunsetSignal={sunsetSignal}
              weekMonday={weekMonday}
              forecastRefresh={forecastRefresh}
              onBlocksChange={handleBlocksChange}
            />
          )}

          <Dialog.Root open={sunsetOpen} onOpenChange={setSunsetOpen}>
            <Dialog.Content className="sunset-confirm" style={{ maxWidth: 420 }}>
              <Dialog.Title>Sunset the week</Dialog.Title>
              <Dialog.Description size="2" mb="3">
                This clears the board for the week ahead. Weekly blocks and Lunch stay.
              </Dialog.Description>
              <ul className="sunset-keep-list">
                {keptAfterSunset.length > 0 ? (
                  keptAfterSunset.map((block) => (
                    <li key={block.id}>{presentBlock(block).title || "Untitled"}</li>
                  ))
                ) : (
                  <li>Nothing on the board will be kept.</li>
                )}
              </ul>
              <div className="sunset-confirm-actions">
                <Button variant="outline" onClick={() => setSunsetOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={confirmSunset}>Confirm</Button>
              </div>
            </Dialog.Content>
          </Dialog.Root>

          <Dialog.Root open={settingsOpen} onOpenChange={setSettingsOpen}>
            <Dialog.Content style={{ maxWidth: 420 }}>
              <Dialog.Title>Swimlane times</Dialog.Title>
              <Dialog.Description size="2" mb="4">
                Set the time range for each row. Rows are shown in order.
              </Dialog.Description>
              <div className="swimlane-settings-list">
                {swimlanes.map((swimlane) => (
                  <div key={swimlane.id} className="swimlane-settings-row">
                    <div className="swimlane-time-inputs">
                      <TextField.Root size="2">
                        <TextField.Input
                          type="time"
                          value={swimlane.start}
                          onChange={(e) =>
                            updateSwimlane(swimlane.id, 'start', e.target.value)
                          }
                        />
                      </TextField.Root>
                      <span className="swimlane-sep">–</span>
                      <TextField.Root size="2">
                        <TextField.Input
                          type="time"
                          value={swimlane.end}
                          onChange={(e) =>
                            updateSwimlane(swimlane.id, 'end', e.target.value)
                          }
                        />
                      </TextField.Root>
                    </div>
                    <IconButton
                      size="2"
                      variant="ghost"
                      color="red"
                      onClick={() => removeSwimlane(swimlane.id)}
                      aria-label="Remove swimlane"
                      disabled={swimlanes.length <= 1}
                    >
                      <TrashIcon />
                    </IconButton>
                  </div>
                ))}
              </div>
              <Button
                variant="soft"
                size="2"
                onClick={addSwimlane}
                style={{ marginTop: 12 }}
              >
                <PlusIcon width="16" height="16" />
                Add row
              </Button>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
                <Dialog.Close>
                  <Button>Done</Button>
                </Dialog.Close>
              </div>
            </Dialog.Content>
          </Dialog.Root>
        </div>
      </Theme>
    </div>
  );
}
