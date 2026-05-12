exports.handler = async (event) => {
  try {
    const { question, athlete } = JSON.parse(event.body);

    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

    if (!OPENAI_API_KEY) {
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: "Missing OpenAI API key",
        }),
      };
    }

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

    const prompt = `
You are Coach AI inside Momentum Engine, a soccer athlete mentoring and readiness app.

Your tone:
- supportive
- realistic
- short
- actionable
- mentorship style
- specific

Do NOT:
- talk like a generic chatbot
- mention being AI
- give medical diagnoses
- give dangerous advice

Keep responses between 3-6 sentences.

Athlete Context:
${athleteContext}

Athlete Question:
${question}
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
                "You are a high-level soccer mentor helping youth athletes improve performance, recovery, confidence, and habits.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          max_tokens: 180,
          temperature: 0.7,
        }),
      }
    );

    const data = await openAIResponse.json();

    const answer =
      data?.choices?.[0]?.message?.content ||
      "Coach AI could not generate a response.";

    return {
      statusCode: 200,
      body: JSON.stringify({
        answer,
      }),
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