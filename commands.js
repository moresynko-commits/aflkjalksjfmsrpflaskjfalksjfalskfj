const { SlashCommandBuilder, ChannelType, PermissionFlagsBits } = require('discord.js');

const sayCommand = new SlashCommandBuilder()
  .setName('say')
  .setDescription('Say a message as the bot')
  .addStringOption(option =>
    option.setName('content')
      .setDescription('Message content')
      .setRequired(true))
  .addChannelOption(option =>
    option.setName('channel')
      .setDescription('Channel to send in (default: current)')
      .setRequired(false))
  .addStringOption(option =>
    option.setName('reply_to')
      .setDescription('Message ID to reply to (optional)')
      .setRequired(false));

module.exports = { sayCommand };
