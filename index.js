const { Client, GatewayIntentBits, Collection, EmbedBuilder, ChannelType } = require('discord.js');
const { sayCommand } = require('./commands.js');

// Config
const GUILD_ID = '1369744973783765063';
const MEMBERS_CHANNEL_ID = '1482705142271971459';
const LOGISTICS_CHANNEL_ID = '1485445173788934326';
const WELCOME_CHANNEL_ID = '1482705196961366018';
const ALLOWED_SAY_ROLES = ['1441879926021296209', '1485512064834207845'];
const PREFIX = '>';
const STATUS_TEXT = 'Michigan State | .gg/michiganstate';
const TOKEN = process.env.DISCORD_TOKEN || 'YOUR_DISCORD_BOT_TOKEN_HERE'; // Token var: DISCORD_TOKEN

// Message IDs for editing
let membersMsgId = null;
let logisticsMsgId = null;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

client.commands = new Collection();

// Ordinal suffix helper
function getOrdinal(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

async function updateMemberCount() {
  const guild = client.guilds.cache.get(GUILD_ID);
  if (!guild) return;

  const memberCount = guild.memberCount - guild.members.cache.filter(m => m.user.bot).size;
  const ordinal = getOrdinal(memberCount);

  const membersChannel = guild.channels.cache.get(MEMBERS_CHANNEL_ID);
  if (membersChannel?.isTextBased()) {
    try {
      if (membersMsgId) {
        const msg = await membersChannel.messages.fetch(membersMsgId);
        msg.edit(`Members: ${memberCount}`);
      } else {
        const msg = await membersChannel.send(`Members: ${memberCount}`);
        membersMsgId = msg.id;
      }
    } catch {
      const msg = await membersChannel.send(`Members: ${memberCount}`);
      membersMsgId = msg.id;
    }
  }

  const logisticsChannel = guild.channels.cache.get(LOGISTICS_CHANNEL_ID);
  if (logisticsChannel?.isTextBased()) {
    const embed = new EmbedBuilder()
      .setTitle('📊 Server Statistics')
      .setDescription(`**Total Members:** ${memberCount.toLocaleString()}\n**Ordinal:** ${memberCount}${ordinal}`)
      .setColor(0x00ff00)
      .setTimestamp()
      .setFooter({ text: 'Updated every 10 minutes' });

    try {
      if (logisticsMsgId) {
        const msg = await logisticsChannel.messages.fetch(logisticsMsgId);
        msg.edit({ embeds: [embed] });
      } else {
        const msg = await logisticsChannel.send({ embeds: [embed] });
        logisticsMsgId = msg.id;
      }
    } catch {
      const msg = await logisticsChannel.send({ embeds: [embed] });
      logisticsMsgId = msg.id;
    }
  }
}

client.once('clientReady', async () => {
  console.log(`Logged in as ${client.user.tag}!`);
  client.user.setActivity(STATUS_TEXT, { type: 'WATCHING' });

  const guild = client.guilds.cache.get(GUILD_ID);
  if (guild) {
    await guild.commands.create(sayCommand);
    console.log('/say command registered');
  }

  await updateMemberCount();
  setInterval(updateMemberCount, 10 * 60 * 1000);
});

client.on('guildMemberAdd', async member => {
  if (member.guild.id !== GUILD_ID) return;

  const guild = member.guild;
  const memberCount = guild.memberCount - guild.members.cache.filter(m => m.user.bot).size;
  const ordinal = getOrdinal(memberCount);

  const welcomeBadge = '<:Welcome0:1485445606297047181><:Welcome1:1485445628698956030><:Welcome2:1485445655982899280><:Welcome3:1485445680607789086><:Welcome4:1485445702212653208><:Welcome5:1485445724249522289>';

  const welcomeEmbed = new EmbedBuilder()
    .setDescription(`${welcomeBadge} **to Michigan State Roleplay, ${member}!**\n\n> - You are our \`${memberCount}${ordinal}\` member.\n> - Thank you for joining, and we hope to see you soon. Check out <#1482705158541676636> for more community details.`)
    .setColor(0x00ff88)
    .setTimestamp();

  const welcomeChannel = guild.channels.cache.get(WELCOME_CHANNEL_ID);
  if (welcomeChannel?.isTextBased()) {
    welcomeChannel.send({ embeds: [welcomeEmbed] }).catch(console.error);
  }
});

async function logSayUsage(channel, userTag, commandType, contentPreview) {
  const logEmbed = new EmbedBuilder()
    .setTitle('📢 Say Command Used')
    .setDescription(`**User:** ${userTag}\n**Type:** ${commandType}\n**Content:** ${contentPreview}`)
    .setColor(0x0099ff)
    .setTimestamp();

  channel.send({ embeds: [logEmbed] }).catch(console.error);
}

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'say') {
    const member = interaction.member;
    if (!ALLOWED_SAY_ROLES.some(roleId => member.roles.cache.has(roleId))) {
      return interaction.reply({ content: '❌ You need Board of Executives or Ownership Team role.', flags: 64 });
    }

    const content = interaction.options.getString('content');
    let targetChannel = interaction.options.getChannel('channel') || interaction.channel;
    const replyToId = interaction.options.getString('reply_to');

    if (targetChannel.type !== ChannelType.GuildText) {
      return interaction.reply({ content: '❌ Invalid channel.', flags: 64 });
    }

    // Log
    const logisticsChannel = interaction.guild.channels.cache.get(LOGISTICS_CHANNEL_ID);
    logSayUsage(logisticsChannel, interaction.user.tag, '/say', content.substring(0, 50) + (content.length > 50 ? '...' : ''));

    try {
      let message;
      if (replyToId) {
        const replyTo = await targetChannel.messages.fetch(replyToId).catch(() => null);
        if (replyTo) {
          message = await targetChannel.send({ content, reply: { messageReference: replyTo.id } });
        } else {
          return interaction.reply({ content: '❌ Invalid reply message ID.', flags: 64 });
        }
      } else {
        message = await targetChannel.send(content);
      }
      await interaction.reply({ content: `✅ Sent: [Jump](${message.url})`, flags: 64 });
    } catch (error) {
      console.error(error);
      await interaction.reply({ content: '❌ Failed to send message.', flags: 64 });
    }
    return;
  }

  const command = client.commands.get(interaction.commandName);
  if (command) {
    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(error);
      await interaction.reply({ content: 'There was an error while executing this command!', flags: 64 });
    }
  }
});

client.on('messageCreate', async message => {
  if (message.author.bot || !message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const commandName = args.shift().toLowerCase();

  if (commandName === 'say') {
    const member = message.member;
    if (!member || !ALLOWED_SAY_ROLES.some(roleId => member.roles.cache.has(roleId))) {
      return message.reply('❌ You need Board of Executives or Ownership Team role.');
    }

    const sayContent = args.join(' ');
    if (!sayContent) return message.reply('❌ Provide a message.');

    // Log
    const guild = message.guild;
    const logisticsChannel = guild.channels.cache.get(LOGISTICS_CHANNEL_ID);
    logSayUsage(logisticsChannel, message.author.tag, '>say', sayContent.substring(0, 50) + (sayContent.length > 50 ? '...' : ''));

    try {
      const sent = await message.channel.send(sayContent);
      await message.delete().catch(() => {});
    } catch (error) {
      console.error(error);
      message.reply('❌ Failed to send message.');
    }
  } else if (commandName === 'ping') {
    await message.reply('Pong!');
  }
});

client.login(TOKEN);

