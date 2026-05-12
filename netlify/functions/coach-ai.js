exports.handler = async (event) => {
  try {
    const { question, athlete, history = [], trendSummary = "", coachNotes = "" } =
      JSON.parse(event.body || "{}");

    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

    if (!OPENAI_API_KEY) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Missing OpenAI API key" }),
      };
    }

    const safeQuestion = question || "";

    const injuryWords = [
      "hurt",
      "hurts",
      "pain",
      "injury",
      "injured",
      "ankle",
      "knee",
      "head",
      "concussion",
      "swollen",
      "can't walk",
      "cannot walk",
      "pop",
      "sharp pain",
    ];

    const isInjuryQuestion = injuryWords.some((word) =>
      safeQuestion.toLowerCase().includes(word)
    );

    const athleteContext = `
Player: ${athlete?.player_name || "Unknown"}
Position: ${athlete?.position || "Unknown"}
Day Type: ${athlete?.day_type || "Unknown"}
Training Load: ${athlete?.training_load || "Unknown"}
Readiness Score: ${athlete?.score || "Unknown"}
Confidence: ${athlete?.confidence || "Unknown"}
Stress: ${athlete?.stress || "Unknown"}
Soreness: ${athlete?.soreness || "Unknown"}
Sleep: ${athlete?.sleep || "Unknown"}
Readiness Label: ${athlete?.readiness_label || "Unknown"}
Risk: ${athlete?.risk_text || "Unknown"}
`;

    const historyContext = history
      .map(
        (item, index) => `
Check-in ${index + 1}:
Score: ${item.score ?? "Unknown"}
Sleep: ${item.sleep ?? "Unknown"}
Confidence: ${item.confidence ?? "Unknown"}
Stress: ${item.stress ?? "Unknown"}
Soreness: ${item.soreness ?? "Unknown"}
Readiness: ${item.readiness_label ?? "Unknown"}
Risk: ${item.risk_text ?? "Unknown"}
`
      )
      .join("\n");

    const prompt = `
You are Coach AI inside Momentum Engine, a soccer athlete mentoring and readiness app created by Coach Rey.

Voice and tone:
- Sound like a real soccer mentor, not a chatbot.
- Be direct, human, calm, and specific.
- Keep it short.
- Use athlete language.
- Give clear next steps.
- Focus on accountability, confidence, recovery, habits, and performance.
- Do not say "it's great to see" unless it feels natural.
- Do not overhype.
- Do not mention being AI.

Response style:
- 3 to 5 short sentences max.
- No long paragraphs.
- No bullet list unless it truly helps.
- Start with the athlete name when available.
- End with a clear action or mindset cue.

Safety:
- Do not diagnose injuries.
- Do not give medical treatment.
- If the question includes pain/injury, tell the athlete to reduce load, avoid pushing through sharp pain, tell coach/parent/trainer, and seek medical help if pain is severe, swelling, limping, or not improving.
- If emergency symptoms appear, tell them to get help immediately.

Athlete Context:
${athleteContext}

Recent Athlete History:
${historyContext || "No history available."}

Trend Summary:
${trendSummary || "No trend summary available."}

Coach Notes:
${coachNotes || "No coach notes provided."}

Athlete Question:
${safeQuestion}

Injury Question Detected:
${isInjuryQuestion ? "Yes" : "No"}
`;

    const openAIResponse = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content:
                "You are a soccer mentor inside Momentum Engine. You give short, direct, human coaching advice based on readiness data, trends, and coach notes.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          max_tokens: 170,
          temperature: 0.65,
        }),
      }
    );

    const data = await openAIResponse.json();

    if (!openAIResponse.ok) {
      console.log("OpenAI API error:", data);
      return {
        statusCode: openAIResponse.status,
        body: JSON.stringify({
          error: data?.error?.message || "OpenAI request failed",
        }),
      };
    }

    const answer =
      data?.choices?.[0]?.message?.content ||
      "Coach AI could not generate a response.";

    return {
      statusCode: 200,
      body: JSON.stringify({ answer }),
    };
  } catch (error) {
    console.log("Coach AI Function Error:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Coach AI server error",
      }),
    };
  }
};