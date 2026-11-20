import { Box, MenuItem, TextField, Typography } from "@mui/material";
import { useState } from "react";
import SoundTimeline from "./SoundTimeline";
import { demos } from "./demoTracks";

export default function App() {
    const [selectedDemo, setSelectedDemo] = useState(0);
    const demo = demos[selectedDemo];
    return (
        <main style={{ padding: "2rem", fontFamily: "sans-serif" }}>

            <Box component="section" sx={{ mt: 4}}>
                <Typography variant="h4" component="h2" sx={{ mb: 2 }}>
                    Music timeline experiment
                </Typography>
                <TextField
                    select
                    size="small"
                    label="Demo"
                    value={selectedDemo}
                    onChange={(event) => setSelectedDemo(Number(event.target.value))}
                    sx={{ mb: 2, minWidth: 160 }}
                >
                    {demos.map(({ name }, index) => (
                        <MenuItem key={name} value={index}>{name}</MenuItem>
                    ))}
                </TextField>
                <SoundTimeline key={demo.name} tracks={demo.tracks} loopSeconds={demo.loopSeconds} />
            </Box>
        </main>
    );
}
