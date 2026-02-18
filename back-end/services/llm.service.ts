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

export async function autocompleteNote(
  partialText: string,
  taskTitle?: string
): Promise<string> {
  try {
    const context = taskTitle ? ` for the task "${taskTitle}"` : "";
    const response = await axios.post(
      LLM_API_URL,
      {
        model: "llama-3.1-8b-instant",
        messages: [
          {
            role: "system",
            content: `You are an autocomplete assistant for a daily standup update note${context}. Given the partial text the user has typed so far, suggest a natural continuation. Return ONLY the completion text (the part that comes AFTER what the user already typed). Keep it concise (1-2 sentences max). Do not repeat the user's text. Do not add any prefixes, quotes, or explanations.`,
          },
          {
            role: "user",
            content: partialText,
          },
        ],
        temperature: 0.6,
        max_tokens: 100,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.LLM_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    return response.data.choices[0].message.content?.trim() || "";
  } catch (error) {
    console.error("LLM autocomplete error:", error);
    return "";
  }
}

export async function refineNote(
  note: string,
  taskTitle?: string
): Promise<string> {
  try {
    const context = taskTitle ? ` The task is: "${taskTitle}".` : "";
    const response = await axios.post(
      LLM_API_URL,
      {
        model: "llama-3.1-8b-instant",
        messages: [
          {
            role: "system",
            content: `You are a professional technical writing assistant.${context} Given a rough daily update note, refine it by:
1. Fixing grammar and spelling errors
2. Making it more detailed and professional
3. Keeping the same meaning and intent
4. Using clear, concise technical language
Return ONLY the refined note text. Do not add any prefixes, explanations, or quotes.`,
          },
          {
            role: "user",
            content: note,
          },
        ],
        temperature: 0.4,
        max_tokens: 300,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.LLM_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    return response.data.choices[0].message.content?.trim() || note;
  } catch (error) {
    console.error("LLM refine error:", error);
    return note;
  }
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

export async function generateTaskProgress(
  mainTask: { title: string; description: string; status: string; priority: string },
  subtasks: Array<{ title: string; status: string; description?: string }>,
  updates: Array<{ date: string; note: string; updatedBy: string; userName?: string }>
): Promise<string> {
  try {
    const subtaskSummary = subtasks.length > 0
      ? subtasks.map((st, i) => `${i + 1}. ${st.title} - Status: ${st.status}`).join("\n")
      : "No subtasks";

    const recentUpdates = updates.slice(-5).map((u) => 
      `- ${u.date}: ${u.note} (by ${u.userName || "Unknown"})`
    ).join("\n");

    const response = await axios.post(
      LLM_API_URL,
      {
        model: "llama-3.1-8b-instant",
        messages: [
          {
            role: "system",
            content: `You are a project progress analyst. Based ONLY on the provided data, generate a factual progress report. Structure:

## Overall Status Summary
[2-3 sentences based on current status, priority, and recent updates]

## Completed Work
[List only subtasks with DONE status. If none, state "None"]

## In Progress
[List activities from recent updates and subtasks with IN_PROGRESS status. If none, state "None"]

## Blockers/Risks
[List only if status is BLOCKED or updates mention blockers. If none, state "None"]

## Next Steps
[Based on TODO subtasks and current progress. If unclear, state "Pending team input"]

IMPORTANT: Do not invent information. Use only the provided data. If data is missing, acknowledge it.`
          },
          {
            role: "user",
            content: `Main Task: ${mainTask.title}
Description: ${mainTask.description || "No description provided"}
Status: ${mainTask.status}
Priority: ${mainTask.priority}

Subtasks:
${subtaskSummary}

Recent Updates:
${recentUpdates || "No updates submitted"}

Generate a factual progress report based ONLY on this data.`
          }
        ],
        temperature: 0.3,
        max_tokens: 800
      },
      {
        headers: {
          "Authorization": `Bearer ${process.env.LLM_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    return response.data.choices[0].message.content || "Unable to generate progress report.";
  } catch (error) {
    console.error("LLM progress generation error:", error);
    throw new Error("Failed to generate progress report");
  }
}
