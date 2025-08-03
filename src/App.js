import "./styles.css";
import '@radix-ui/themes/styles.css';
import { Theme } from '@radix-ui/themes';
import { useState, useEffect, useCallback, useRef } from "react";
import Section from "./Section";

export default function App() {
  const [sections, setSections] = useState([{ id: Date.now() }]);

  return (
    <div className="App">
      <Theme>
        <div>
          <h1>Weekly Planner</h1>
          {sections.map((section) => (
            <Section key={section.id} section={section} />
          ))}
          <button
            className="new-section"
            onClick={() => setSections([...sections, { id: Date.now() }])}
          >
            New Section
          </button>
        </div>
      </Theme>
    </div>   
  );
}