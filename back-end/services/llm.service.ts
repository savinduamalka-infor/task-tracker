import axios from "axios";

const LLM_API_URL = "https://api.groq.com/openai/v1/chat/completions";

export async function generateSubtasks(taskTitle: string, taskDescription: string) {
  const maxRetries = 2;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[Subtasks] Attempt ${attempt}/${maxRetries} for: "${taskTitle}"`);
      
      const response = await axios.post(
        LLM_API_URL,
        {
          model: "llama-3.1-8b-instant",
          messages: [
            {
              role: "system",
              content: "You are a task breakdown assistant. You MUST respond with ONLY a valid JSON array. No explanations, no markdown, no extra text. Just the JSON array."
            },
            {
              role: "user",
              content: `Break this task into 3-5 subtasks:\n\nTask: ${taskTitle}\nDescription: ${taskDescription || 'No description'}\n\nRespond with ONLY this JSON format:\n[{"title": "Subtask 1", "description": "Details"}, {"title": "Subtask 2", "description": "Details"}]`
            }
          ],
          temperature: 0.3,
          max_tokens: 600
        },
        {
          headers: {
            "Authorization": `Bearer ${process.env.LLM_API_KEY}`,
            "Content-Type": "application/json"
          },
          timeout: 20000
        }
      );

      const content = response.data.choices[0]?.message?.content?.trim();
      if (!content) {
        console.error(`[Subtasks] Attempt ${attempt}: Empty response`);
        if (attempt < maxRetries) continue;
        return [];
      }

      console.log(`[Subtasks] Attempt ${attempt} raw response:`, content.substring(0, 200));

      let parsed;
      try {
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        } else {
          parsed = JSON.parse(content);
        }
      } catch (parseError) {
        console.error(`[Subtasks] Attempt ${attempt}: Parse failed`);
        if (attempt < maxRetries) continue;
        return [];
      }

      if (Array.isArray(parsed) && parsed.length > 0 && parsed.every(item => item.title && item.description)) {
        console.log(`[Subtasks] Success: ${parsed.length} subtasks generated`);
        return parsed;
      }

      console.error(`[Subtasks] Attempt ${attempt}: Invalid array structure`);
      if (attempt < maxRetries) continue;
      return [];
      
    } catch (error: any) {
      console.error(`[Subtasks] Attempt ${attempt} error:`, error.response?.data?.error || error.message);
      if (attempt < maxRetries && error.response?.status !== 401) continue;
      return [];
    }
  }
  
  return [];
}

export interface DailySummaryTask {
  title: string;
  status: string;
  priority: string;
  assigneeName: string;
  projectName?: string;
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
            content: `You are an autocomplete assistant for a daily standup update note${context}. Given the partial text the user has typed so far, suggest a natural continuation. Output must be ONLY the completion text (the part that comes AFTER what the user already typed). Keep it concise (1-2 sentences max). Do not repeat the user's text. Do not add any prefixes, quotes, explanations, or extra characters. Ensure the output is clean and directly continuable from the partial text.`,
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
Output must be ONLY the refined note text. Do not add any prefixes, explanations, quotes, or extra characters. Ensure the output is clean, standalone text without any wrappers.`,
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
      const projectLabel = t.projectName ? `, Project: ${t.projectName}` : "";
      return `${i + 1}. "${t.title}" (Priority: ${t.priority}, Assignee: ${t.assigneeName}, Current Status: ${t.status}${projectLabel})\n${updateNotes}`;
    }).join("\n\n");

    const response = await axios.post(
      LLM_API_URL,
      {
        model: "llama-3.1-8b-instant",
        messages: [
          {
            role: "system",
            content: `You are a STRICTLY FACTUAL stand-up meeting summarizer. 

**ZERO TOLERANCE FOR HALLUCINATION — THIS IS A HARD RULE:**

You are ONLY allowed to use information that is EXPLICITLY present in the "Tasks with today's updates" section of the user message. 

- The list provided is the COMPLETE and ONLY data for this date. There are no other tasks, projects, assignees, updates, or details in existence for this summary.
- You are FORBIDDEN from inventing, creating, assuming, guessing, or adding ANY task, title, assignee name, project name, note, status, or any other detail that is not literally written in the provided data.
- Never use placeholder or example names like "Task 1", "Task 2", "John", "Jane", "Project A", "Project B", etc. unless they appear EXACTLY in the input data.
- If the "Tasks with today's updates" section is empty or contains no tasks, you MUST output EXACTLY: "No data available on this day. No tasks or updates were provided."

For the sections below, use ONLY the exact matching items from the data:

## 🏁 Completed Today
List ONLY tasks where Current Status is exactly "DONE". Format: "TaskTitle (AssigneeName)"
If none, output EXACTLY: "No tasks were completed today."

## 🚧 In Progress
List ONLY tasks where Current Status is exactly "IN_PROGRESS". Format each task on ONE line:
- If task has update notes: "TaskTitle (AssigneeName): note text"
- If task has NO update notes: "TaskTitle (AssigneeName) — No updates submitted today"
Never put "No updates submitted today" as a separate bullet point.
If no IN_PROGRESS tasks exist, output EXACTLY: "No tasks in progress today."

## 🚫 Blocked
List ONLY tasks that have a blockedReason OR where Current Status is exactly "BLOCKED". Format: "TaskTitle (AssigneeName): blocked reason"
If none, output EXACTLY: "No blockers — great work!"

## 🚀 Projects Active Today
List ONLY the distinct project names that appear in the provided data. Group only the exact tasks that belong to them. 
If no projects appear in the data, skip this section entirely.

## 📊 Team Snapshot
Write exactly 2-3 factual sentences based ONLY on the statuses and update notes that are actually present in the data. No opinions, no speculation.

ADDITIONAL HARD RULES:
- Every single word about tasks, people, or projects must come directly from the input data.
- Never add any extra tasks, even if it feels "reasonable".
- If you are unsure whether something is in the data — DO NOT include it.
- Output MUST be ONLY the Markdown with the exact 5 sections above. No extra text, no introductions, no conclusions, no explanations, no wrappers.

Violating any of these rules is not allowed.`
          },
          {
            role: "user",
            content: `Date: ${date}\n\nTasks with today's updates:\n\n${taskLines}\n\nGenerate the end-of-day sync summary using ONLY the data above. Do not invent anything.`
          }
        ],
        temperature: 0.1,
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

IMPORTANT: Do not invent information. Use only the provided data. If data is missing, acknowledge it.
Output must be ONLY the structured report in Markdown as specified. Do not add any extra text, introductions, conclusions, or wrappers before or after the report. Ensure the output is clean and follows the exact structure without deviations.`
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