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
