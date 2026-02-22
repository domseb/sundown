import "./styles.css";
import '@radix-ui/themes/styles.css';
import { Theme, Dialog, IconButton, Button, TextField } from '@radix-ui/themes';
import { useState } from "react";
import { GearIcon, PlusIcon, TrashIcon } from "@radix-ui/react-icons";
import Section from "./Section";
import SundownLogo from "./sundown-logo.svg";

const DEFAULT_SWIMLANES = [
  { id: 'sl-1', start: '05:00', end: '07:00' },
  { id: 'sl-2', start: '09:00', end: '12:00' },
  { id: 'sl-3', start: '12:00', end: '13:00' },
  { id: 'sl-4', start: '13:00', end: '17:00' },
  { id: 'sl-5', start: '19:00', end: '22:00' },
];

export default function App() {
  const [swimlanes, setSwimlanes] = useState(DEFAULT_SWIMLANES);
  const [settingsOpen, setSettingsOpen] = useState(false);

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

  return (
    <div className="App">
      <Theme>
        <div className="app-layout">
          <header className="app-header">
            <img src={SundownLogo} alt="Sundown" className="app-logo" />
            <div className="app-header-settings">
              <IconButton
                size="3"
                variant="ghost"
                onClick={() => setSettingsOpen(true)}
                aria-label="Configure swimlanes"
              >
                <GearIcon width="20" height="20" />
              </IconButton>
            </div>
          </header>

          <Section swimlanes={swimlanes} onSwimlaneChange={updateSwimlane} />

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
