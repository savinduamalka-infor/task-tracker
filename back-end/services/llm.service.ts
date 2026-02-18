import axios from "axios";

const LLM_API_URL = "https://api.groq.com/openai/v1/chat/completions";

export async function generateSubtasks(taskTitle: string, taskDescription: string) {
  try {
    const response = await axios.post(
      LLM_API_URL,
      {
        model: "llama-3.1-8b-instant",
        messages: [
          {
            role: "system",
            content: "You are a task breakdown assistant. Given a task title and description, generate 3-5 actionable subtasks. Return ONLY a JSON array of objects with 'title' and 'description' fields. Keep subtasks concise and specific."
          },
          {
            role: "user",
            content: `Task: ${taskTitle}\nDescription: ${taskDescription}\n\nGenerate subtasks as JSON array.`
          }
        ],
        temperature: 0.7,
        max_tokens: 500
      },
      {
        headers: {
          "Authorization": `Bearer ${process.env.LLM_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    const content = response.data.choices[0].message.content;
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return [];
  } catch (error) {
    console.error("LLM subtask generation error:", error);
    return [];
  }
}

export interface DailySummaryTask {
  title: string;
  status: string;
  priority: string;
  assigneeName: string;
  updates: Array<{
    note: string;
    blockedReason?: string;
  }>;
}

export async function generateDailySummary(
  date: string,
  tasks: DailySummaryTask[]
): Promise<string> {
  try {
    const taskLines = tasks.map((t, i) => {
      const updateNotes = t.updates.length
        ? t.updates.map((u) => `  - ${u.note}${u.blockedReason ? ` (Blocked: ${u.blockedReason})` : ""}`).join("\n")
        : "  - No updates submitted today";
      return `${i + 1}. "${t.title}" (Priority: ${t.priority}, Assignee: ${t.assigneeName}, Current Status: ${t.status})\n${updateNotes}`;
    }).join("\n\n");

    const response = await axios.post(
      LLM_API_URL,
      {
        model: "llama-3.1-8b-instant",
        messages: [
          {
            role: "system",
            content: `You are a concise stand-up meeting summarizer for a software team. Given a list of tasks and their daily updates for a specific date, produce a clear, well-structured end-of-day sync summary in Markdown.

Your summary MUST include these sections:

## 🏁 Completed Today
List tasks that moved to DONE today. If none, say "No tasks were completed today."

## 🚧 In Progress
List tasks actively worked on (IN_PROGRESS). Briefly mention what was done based on the update notes.

## 🚫 Blocked
List any blocked tasks with their blocked reasons. If none, say "No blockers — great work!"

## 📊 Team Snapshot
Give a 2-3 sentence overall assessment of the team's day — productivity, momentum, any concerns.

Rules:
- Be concise. Use bullet points.
- Reference assignee names.
- Do not invent information not in the data.
- Do not include raw JSON or code blocks.
- Keep it professional but friendly.`
          },
          {
            role: "user",
            content: `Date: ${date}\n\nTasks with today's updates:\n\n${taskLines}\n\nGenerate the end-of-day sync summary.`
          }
        ],
        temperature: 0.5,
        max_tokens: 1000
      },
      {
        headers: {
          "Authorization": `Bearer ${process.env.LLM_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    return response.data.choices[0].message.content || "Unable to generate summary.";
  } catch (error) {
    console.error("LLM daily summary error:", error);
    throw new Error("Failed to generate AI summary");
  }
}
