import { Request, Response } from "express";
import { generateSubtasks } from "../services/llm.service.js";

export async function suggestSubtasks(req: Request, res: Response) {
  try {
    const { title, description } = req.body;
    
    if (!title) {
      res.status(400).json({ error: "Title is required" });
      return;
    }

    const subtasks = await generateSubtasks(title, description || "");
    res.json({ subtasks });
  } catch (error) {
    console.error("Suggest subtasks error:", error);
    res.status(500).json({ error: "Failed to generate subtasks" });
  }
}
