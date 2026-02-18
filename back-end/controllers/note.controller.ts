import { Request, Response } from "express";
import {
  autocompleteNote,
  refineNote,
} from "../services/llm.service.js";

export async function autocompleteNoteHandler(req: Request, res: Response) {
  try {
    const { partialText, taskTitle } = req.body;

    if (!partialText || typeof partialText !== "string" || partialText.trim().length < 3) {
      return res.status(400).json({ error: "partialText must be at least 3 characters" });
    }

    const suggestion = await autocompleteNote(partialText.trim(), taskTitle);
    res.json({ suggestion });
  } catch (error) {
    console.error("Autocomplete error:", error);
    res.status(500).json({ error: "Failed to generate autocomplete suggestion" });
  }
}

export async function refineNoteHandler(req: Request, res: Response) {
  try {
    const { note, taskTitle } = req.body;

    if (!note || typeof note !== "string" || note.trim().length < 3) {
      return res.status(400).json({ error: "note must be at least 3 characters" });
    }

    const refined = await refineNote(note.trim(), taskTitle);
    res.json({ refined });
  } catch (error) {
    console.error("Refine error:", error);
    res.status(500).json({ error: "Failed to refine note" });
  }
}
