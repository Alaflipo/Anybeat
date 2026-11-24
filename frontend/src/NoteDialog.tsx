import { Autocomplete, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField } from "@mui/material";
import { useState } from "react";

import { drumKeys, midiNoteName } from "./generalMidi";

const drumNames = new Map(drumKeys.map(({ key, name }) => [midiNoteName(key), name]));
const notes = Array.from({ length: 128 }, (_, pitch) => midiNoteName(pitch));

type NoteDialogProps = {
    trackName: string;
    onClose: () => void;
    initialNote?: string;
    isDrumKit: boolean;
    onSave: (note: string) => void;
};

export default function NoteDialog({ trackName, initialNote, isDrumKit, onClose, onSave }: NoteDialogProps) {
    const [note, setNote] = useState<string | null>(initialNote ?? null);
    // Imported or demo notes may use flats, while the default list uses sharps.
    const sounds = isDrumKit ? [...drumNames.keys()] : notes;
    const options = initialNote && !sounds.includes(initialNote) ? [...sounds, initialNote] : sounds;

    return (
        <Dialog open onClose={onClose} fullWidth maxWidth="xs">
            <DialogTitle>{initialNote ? "Edit note in" : "Add note to"} {trackName}</DialogTitle>
            <DialogContent>
                <Autocomplete
                    options={options}
                    getOptionLabel={(pitch) => isDrumKit ? drumNames.get(pitch) ?? pitch : pitch}
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
