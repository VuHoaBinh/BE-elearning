const openai = require('../configs/openai.config');

module.exports = {
  handleChatGPTOpenAI: async (message) => {
    try {
      const { data } = await openai.createCompletion({
        model: "text-davinci-003",
        prompt: `${message}`,
        temperature: parseFloat(process.env.TEMPERATURE_RESPONSE_OPENAI) || 0.5,
        max_tokens: parseFloat(process.env.MAX_TOKENS_RESPONSE_OPENAI) || 60,
        top_p: parseFloat(process.env.TOP_P_RESPONSE_OPENAI) || 0.3,
        frequency_penalty: parseFloat(process.env.FREQUENCY_PENALTY_RESPONSE_OPENAI) || 0.5,
        presence_penalty: parseFloat(process.env.PRESENCE_PENALTY_RESPONSE_OPENAI) || 0.0,
      });
      console.log('>> ChatGPTOpenAI response:', data.choices[0].text);
      return data?.choices[0]?.text || "Error! An error occurred. Please contact me m.me/hnam.se"
    } catch (error) {
      console.log(error, '===error===');
      return "Error! An error occurred. Please contact me m.me/hnam.se"
    }
  },

}