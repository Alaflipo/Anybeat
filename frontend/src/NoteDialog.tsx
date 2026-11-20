import { Autocomplete, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField } from "@mui/material";
import { useState } from "react";

const pitchClasses = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

// List the pitches in MIDI order, with MIDI note 60 written as C4.
const notes = Array.from({ length: 128 }, (_, pitch) =>
    `${pitchClasses[pitch % 12]}${Math.floor(pitch / 12) - 1}`,
);

type NoteDialogProps = {
    trackName: string;
    onClose: () => void;
    initialNote?: string;
    onSave: (note: string) => void;
};

export default function NoteDialog({ trackName, initialNote, onClose, onSave }: NoteDialogProps) {
    const [note, setNote] = useState<string | null>(initialNote ?? null);
    // Imported or demo notes may use flats, while the default list uses sharps.
    const options = initialNote && !notes.includes(initialNote) ? [...notes, initialNote] : notes;

    return (
        <Dialog open onClose={onClose} fullWidth maxWidth="xs">
            <DialogTitle>{initialNote ? "Edit note in" : "Add note to"} {trackName}</DialogTitle>
            <DialogContent>
                <Autocomplete
                    options={options}
                    value={note}
                    onChange={(_, pitch) => setNote(pitch)}
                    renderInput={(params) => <TextField {...params} autoFocus label="Note" />}
                    sx={{ mt: 1 }}
                />
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button
                    variant="contained"
                    disabled={note === null}
                    onClick={() => {
                        if (note !== null) onSave(note);
                    }}
                >
                    {initialNote ? "Save note" : "Add note"}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
