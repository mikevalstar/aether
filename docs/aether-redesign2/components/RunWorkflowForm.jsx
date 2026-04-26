// RunWorkflowForm — composed example using WLabel/WField/WInput/WTextarea/WSelect.
// Demonstrates the form atom layout: header w/ kicker + workflow name + model chip,
// fields stacked, footer with keyboard hint + cancel/save/run buttons.

const { useState: useStateRWF } = React;

function RunWorkflowForm() {
  const T = window.consoleTokens;
  const { WChip, WButton, WField, WInput, WTextarea, WSelect } = window;
  const [skill, setSkill]   = useStateRWF('');
  const [notes, setNotes]   = useStateRWF('');
  const [status, setStatus] = useStateRWF('');

  return (
    <div style={{
      background: T.panelSolid, border: `1px solid ${T.border}`,
      borderRadius: 6, padding: '20px 22px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
        <span style={{ fontFamily: T.mono, fontSize: 9.5, color: T.lime, letterSpacing: 1.5, fontWeight: 600 }}>RUN WORKFLOW</span>
        <span style={{ width: 4, height: 4, borderRadius: 3, background: T.border }} />
        <span style={{ fontSize: 17, fontWeight: 600, letterSpacing: -0.3, color: T.ink, fontFamily: T.display }}>Add AI Skill</span>
        <WChip>claude-haiku-4-5</WChip>
        <span style={{ flex: 1 }} />
        <span style={{ fontFamily: T.mono, fontSize: 10.5, color: T.inkMuted, letterSpacing: 0.5 }}>WF_01 · 3 fields</span>
      </div>
      <p style={{ margin: '0 0 18px', fontSize: 13, color: T.inkDim, lineHeight: 1.5 }}>
        Add a new AI skill to the AI Skills note — bookmarked by default unless already tried.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <WField label="Skill URL" required prefix="↗">
          <WInput
            value={skill}
            onChange={setSkill}
            placeholder="https://github.com/owner/repo or https://skills.sh/…"
            prefix
          />
        </WField>

        <WField label="Additional Instructions" hint="markdown ok">
          <WTextarea
            value={notes}
            onChange={setNotes}
            placeholder="Any extra notes — what it does, why you want it, specific install command…"
            rows={4}
          />
        </WField>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <WField label="Skill Status" required>
            <WSelect
              value={status}
              onChange={setStatus}
              placeholder="Select…"
              options={[
                { value: 'untried',     label: 'Untried — bookmark only' },
                { value: 'in-progress', label: 'In progress' },
                { value: 'mastered',    label: 'Mastered' },
                { value: 'archived',    label: 'Archived' },
              ]}
            />
          </WField>
          <WField label="Bookmark folder" hint="optional">
            <WSelect
              value=""
              onChange={() => {}}
              placeholder="vault/skills/inbox"
              options={[
                { value: 'inbox',   label: 'vault/skills/inbox' },
                { value: 'reading', label: 'vault/skills/reading' },
                { value: 'archive', label: 'vault/skills/archive' },
              ]}
            />
          </WField>
        </div>
      </div>

      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 12, paddingTop: 16, marginTop: 18, borderTop: `1px solid ${T.border}`,
      }}>
        <div style={{ fontFamily: T.mono, fontSize: 10.5, color: T.inkMuted, letterSpacing: 0.5 }}>
          ⌘↩ TO RUN · ESC TO CLOSE · DRAFT AUTOSAVED 2s AGO
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <WButton kind="ghost">CANCEL</WButton>
          <WButton kind="secondary" icon="◆">SAVE DRAFT</WButton>
          <WButton kind="primary" icon="▸">RUN WORKFLOW</WButton>
        </div>
      </div>
    </div>
  );
}

window.RunWorkflowForm = RunWorkflowForm;
