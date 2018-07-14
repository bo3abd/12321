const Discord = require("discord.js");
const ytdl = require("ytdl-core");
const { Client, Util } = require('discord.js');
const getYoutubeID = require('get-youtube-id');
const fetchVideoInfo = require('youtube-info');
const YouTube = require('simple-youtube-api');
const youtube = new YouTube("AIzaSyAdORXg7UZUo7sePv97JyoDqtQVi3Ll0b8");
const queue = new Map();
const client = new Discord.Client();



/*
البكجآت
npm install discord.js
npm install ytdl-core
npm install get-youtube-id
npm install youtube-info
npm install simple-youtube-api
npm install queue
*/

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
    console.log(`in ${client.guilds.size} servers `)
console.log(`[M] ${client.users.size}`)
    client.user.setStatus("idle")
});


const prefix = "A"
client.on('message', async msg => { // eslint-disable-line
	if (msg.author.bot) return undefined;
	if (!msg.content.startsWith(prefix)) return undefined;
	const args = msg.content.split(' ');
	const searchString = args.slice(1).join(' ');

	const url = args[1] ? args[1].replace(/<(.+)>/g, '$1') : '';
	const serverQueue = queue.get(msg.guild.id);

	let command = msg.content.toLowerCase().split(" ")[0];
	command = command.slice(prefix.length)

	if (command === `play`) {
		const voiceChannel = msg.member.voiceChannel;
		if (!voiceChannel) return msg.channel.send('يجب توآجد حضرتك بروم صوتي .');
		const permissions = voiceChannel.permissionsFor(msg.client.user);
		if (!permissions.has('CONNECT')) {
			
			return msg.channel.send('لا يتوآجد لدي صلاحية للتكلم بهذآ الروم');
		}
		if (!permissions.has('SPEAK')) {
			return msg.channel.send('لا يتوآجد لدي صلاحية للتكلم بهذآ الروم');
		}

		if (!permissions.has('EMBED_LINKS')) {
			return msg.channel.sendMessage("**يجب توآفر برمشن `EMBED LINKS`لدي **")
		}

		if (url.match(/^https?:\/\/(www.youtube.com|youtube.com)\/playlist(.*)$/)) {
			const playlist = await youtube.getPlaylist(url);
			const videos = await playlist.getVideos();

			for (const video of Object.values(videos)) {
				const video2 = await youtube.getVideoByID(video.id); // eslint-disable-line no-await-in-loop
				await handleVideo(video2, msg, voiceChannel, true); // eslint-disable-line no-await-in-loop
			}
			return msg.channel.send(` **${playlist.title}** تم الإضآفة إلى قأئمة التشغيل`);
		} else {
			try {

				var video = await youtube.getVideo(url);
			} catch (error) {
				try {
					var videos = await youtube.searchVideos(searchString, 5);
					let index = 0;
					const embed1 = new Discord.RichEmbed()
			        .setDescription(`**الرجآء من حضرتك إختيآر رقم المقطع** :
${videos.map(video2 => `[**${++index} **] \`${video2.title}\``).join('\n')}`)

					.setFooter("by !A")
					msg.channel.sendEmbed(embed1).then(message =>{message.delete(20000)})
					
					// eslint-disable-next-line max-depth
					try {
						var response = await msg.channel.awaitMessages(msg2 => msg2.content > 0 && msg2.content < 11, {
							maxMatches: 1,
							time: 15000,
							errors: ['time']
						});
					} catch (err) {
						console.error(err);
						return msg.channel.send('لم يتم إختيآر مقطع صوتي');
					}
					const videoIndex = parseInt(response.first().content);
					var video = await youtube.getVideoByID(videos[videoIndex - 1].id);
				} catch (err) {
					console.error(err);
					return msg.channel.send(':X: لا يتوفر نتآئج بحث ');
				}
			}

			return handleVideo(video, msg, voiceChannel);
		}
	} else if (command === `skip`) {
		if (!msg.member.voiceChannel) return msg.channel.send('أنت لست بروم صوتي .');
		if (!serverQueue) return msg.channel.send('لا يتوفر مقطع لتجآوزه');
		serverQueue.connection.dispatcher.end('تم تجآوز هذآ المقطع');
		return undefined;
	} else if (command === `stop`) {
		if (!msg.member.voiceChannel) return msg.channel.send('أنت لست بروم صوتي .');
		if (!serverQueue) return msg.channel.send('لا يتوفر مقطع لإيقآفه');
		serverQueue.songs = [];
		serverQueue.connection.dispatcher.end('تم إيقآف هذآ المقطع');
		return undefined;
	} else if (command === `vol`) {
		if (!msg.member.voiceChannel) return msg.channel.send('أنت لست بروم صوتي .');
		if (!serverQueue) return msg.channel.send('لا يوجد شيء شغآل.');
		if (!args[1]) return msg.channel.send(`:loud_sound: مستوى الصوت **${serverQueue.volume}**`);
		serverQueue.volume = args[1]; 
		serverQueue.connection.dispatcher.setVolumeLogarithmic(args[1] / 50);
		return msg.channel.send(`:speaker: تم تغير الصوت الي **${args[1]}**`);
	} else if (command === `np`) {
		if (!serverQueue) return msg.channel.send('لا يوجد شيء حالي ف العمل.');
		const embedNP = new Discord.RichEmbed()
	.setDescription(`:notes: الان يتم تشغيل : **${serverQueue.songs[0].title}**`)
		return msg.channel.sendEmbed(embedNP);
	} else if (command === `queue`) {
 
		if (!serverQueue) return msg.channel.send('لا يوجد شيء حالي ف العمل.');
		let index = 0;
		 
		const embedqu = new Discord.RichEmbed()
 
.setDescription(`**Songs Queue**
${serverQueue.songs.map(song => `**${++index} -** ${song.title}`).join('\n')}
**الان يتم تشغيل** ${serverQueue.songs[0].title}`)
		return msg.channel.sendEmbed(embedqu);
	} else if (command === `pause`) {
		if (serverQueue && serverQueue.playing) {
			serverQueue.playing = false;
			serverQueue.connection.dispatcher.pause();
			return msg.channel.send('تم إيقاف الموسيقى مؤقتا!');
		} 
		return msg.channel.send('لا يوجد شيء حالي ف العمل.');
	} else if (command === "resume") {
		if (serverQueue && !serverQueue.playing) {
			serverQueue.playing = true;
			serverQueue.connection.dispatcher.resume();
			return msg.channel.send('استأنفت الموسيقى بالنسبة لك !');
		} 
		return msg.channel.send('لا يوجد شيء حالي في العمل.');
	}

	return undefined;
});
 
async function handleVideo(video, msg, voiceChannel, playlist = false) {
	const serverQueue = queue.get(msg.guild.id);
	console.log(video);

//	console.log('yao: ' + Util.escapeMarkdown(video.thumbnailUrl));
	const song = {
		id: video.id,
		title: Util.escapeMarkdown(video.title),
		url: `https://www.youtube.com/watch?v=${video.id}`
	};
	if (!serverQueue) {
		const queueConstruct = {
			textChannel: msg.channel,
			voiceChannel: voiceChannel,
			connection: null,
			songs: [],
			volume: 5,
			playing: true
		};
		queue.set(msg.guild.id, queueConstruct);

		queueConstruct.songs.push(song);

		try {
			var connection = await voiceChannel.join();
			queueConstruct.connection = connection;
			play(msg.guild, queueConstruct.songs[0]);
		} catch (error) {
			console.error(`I could not join the voice channel: ${error}`);
			queue.delete(msg.guild.id);
			return msg.channel.send(`لا أستطيع دخول هذآ الروم ${error}`);
		}
	} else {
		serverQueue.songs.push(song);
		console.log(serverQueue.songs);
		if (playlist) return undefined;
		else return msg.channel.send(` **${song.title}** تم اضافه الاغنية الي القائمة!`);
	}
	return undefined;
}

function play(guild, song) {
	const serverQueue = queue.get(guild.id);

	if (!song) {
		serverQueue.voiceChannel.leave();
		queue.delete(guild.id);
		return;
	}
	console.log(serverQueue.songs);

	const dispatcher = serverQueue.connection.playStream(ytdl(song.url))
		.on('end', reason => {
			if (reason === 'Stream is not generating quickly enough.') console.log('Song ended.');
			else console.log(reason);
			serverQueue.songs.shift();
			play(guild, serverQueue.songs[0]);
		})
		.on('error', error => console.error(error));
	dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);

	serverQueue.textChannel.send(`بدء تشغيل : **${song.title}**`);
}



const adminprefix = "A";
const devs = ['415649344864387072'];
client.on('message', message => {
  var argresult = message.content.split(` `).slice(1).join(' ');
    if (!devs.includes(message.author.id)) return;
    
if (message.content.startsWith(adminprefix + 'setgame')) {
  client.user.setGame(argresult);
    message.channel.sendMessage(`**${argresult} تم تغيير بلاينق البوت إلى **`)
} else 
  if (message.content.startsWith(adminprefix + 'setname')) {
client.user.setUsername(argresult).then
    message.channel.sendMessage(`**${argresult}** : تم تغيير أسم البوت إلى`)
return message.reply("**لا يمكنك تغيير الاسم يجب عليك الانتظآر لمدة ساعتين . **");
} else
  if (message.content.startsWith(adminprefix + 'setavatar')) {
client.user.setAvatar(argresult);
  message.channel.sendMessage(`**${argresult}** : تم تغير صورة البوت`);
      } else     
if (message.content.startsWith(adminprefix + 'setT')) {
  client.user.setGame(argresult, "https://www.twitch.tv/idk");
    message.channel.sendMessage(`**تم تغيير تويتش البوت إلى  ${argresult}**`)
}

});



client.on("message", message => {
 if (message.content === `Ahelp`) {
  const embed = new Discord.RichEmbed() 
      .setColor("#000000")
      .setDescription(`
${prefix}play > لتشغيل أغنية برآبط أو بأسم
${prefix}skip > لتجآوز الأغنية الحآلية
${prefix}pause > إيقآف الأغنية مؤقتا
${prefix}resume > لموآصلة الإغنية بعد إيقآفهآ مؤقتا
${prefix}vol > لتغيير درجة الصوت 100 - 0
${prefix}stop > لإخرآج البوت من الروم
${prefix}np > لمعرفة الأغنية المشغلة حآليا
${prefix}queue > لمعرفة قآئمة التشغيل

 `)
   message.channel.sendEmbed(embed)
    
   }
   }); 




client.on('message', message => {
    if(!message.channel.guild) return;
if (message.content.startsWith('Aping')) {
if(!message.channel.guild) return;
var msg = `${Date.now() - message.createdTimestamp}`
var api = `${Math.round(client.ping)}`
if (message.author.bot) return;
let embed = new Discord.RichEmbed()
.setAuthor(message.author.username,message.author.avatarURL)
.setColor('RANDOM')
.addField('**Time Taken:**',msg + " ms :signal_strength: ")
.addField('**WebSocket:**',api + " ms :signal_strength: ")
message.channel.send({embed:embed});
}
});






  client.on('message', message => {
   if(message.content.startsWith("^دعوات")) {
    message.guild.fetchInvites().then(invs => {
      let user = message.mentions.users.first() || message.author
      let personalInvites = invs.filter(i => i.inviter.id === user.id);
      let inviteCount = personalInvites.reduce((p, v) => v.uses + p, 0);
message.channel.send(`${user} لقد قمت بدعوه ${inviteCount} دعوه.`);
});
  }
});
  




   
client.on('message', message => {
  // Voice only works in guilds, if the message does not come from a guild,
  // we ignore it
  if (!message.guild) return;

  if (message.content === '.join') {
    // Only try to join the sender's voice channel if they are in one themselves
    if (message.member.voiceChannel) {
      message.member.voiceChannel.join()
        .then(connection => { // Connection is an instance of VoiceConnection
          message.reply('تم دخول الروم');
        })
        .catch(console.log);
    } else {
      message.reply('يجب ان تكون في رومات صوتية');
    }
  }
});



    client.on("roleCreate", rc => {
  const channel = rc.guild.channels.find("name", "log") //تقدر تغير اسم الشات
  if(channel) {
  var embed = new Discord.RichEmbed()
  .setTitle(rc.guild.name)
  .setDescription(`***Created Role Name : *** **${rc.name}** `)
  .setColor(`RANDOM`)
  .setTimestamp(); 
  channel.sendEmbed(embed)
  }
  });
  //By S Codes
  client.on("roleDelete",  rd => {
  const channel = rd.guild.channels.find("name", "log")
  if(channel) {
  var embed = new Discord.RichEmbed()
  .setTitle(rd.guild.name)
  .setDescription(`***Deleted Role Name : *** **${rd.name}** `)
  .setColor(`RANDOM`)
  .setTimestamp(); 
  channel.sendEmbed(embed)
  }
  });

client.on("channelCreate",  cc => {
  const channel = cc.guild.channels.find("name", "log")
  if(channel) {
  var embed = new Discord.RichEmbed()
  .setTitle(cc.guild.name)
  .setDescription(`***Channel Created Name : *** **${cc.name}** ⬅️`)
  .setColor(`RANDOM`)
  .setTimestamp(); 
  channel.sendEmbed(embed)
  }
  });

   client.on("deleteChannel",  dc => {
  const channel = dc.guild.channels.find("name", "log")
  if(channel) {
  var embed = new Discord.RichEmbed()
  .setTitle(dc.guild.name)
  .setDescription(`***Channel Deleted Name : *** **${dc.name}** ⬅️`)
  .setColor(`RANDOM`)
  .setTimestamp(); 
  channel.sendEmbed(embed)
  }
  });
  
  
  
  client.on('messageUpdate', (message, newMessage) => {
    if (message.content === newMessage.content) return;
    if (!message || !message.id || !message.content || !message.guild || message.author.bot) return;
    const channel = message.guild.channels.find('name', 'log');
    if (!channel) return;

    let embed = new Discord.RichEmbed()
       .setAuthor(`${message.author.tag}`, message.author.avatarURL)
       .setColor('SILVER')
       .setDescription(`✏ **تعديل رساله
ارسلها <@${message.author.id}>                                                                                                                         تم تعديلها في شات** <#${message.channel.id}>\n\nقبل التعديل:\n \`${message.cleanContent}\`\n\nبعد التعديل:\n \`${newMessage.cleanContent}\``)
       .setTimestamp();
     channel.send({embed:embed});


});

client.on('guildMemberAdd', member => {
    if (!member || !member.id || !member.guild) return;
    const guild = member.guild;
	
    const channel = member.guild.channels.find('name', 'log');
    if (!channel) return;
    let memberavatar = member.user.avatarURL
    const fromNow = moment(member.user.createdTimestamp).fromNow();
    const isNew = (new Date() - member.user.createdTimestamp) < 900000 ? '🆕' : '';
    
    let embed = new Discord.RichEmbed()
       .setAuthor(`${member.user.tag}`, member.user.avatarURL)
	   .setThumbnail(memberavatar)
       .setColor('GREEN')
       .setDescription(`📥 <@${member.user.id}> **Joined To The Server**\n\n`)
       .setTimestamp();
     channel.send({embed:embed});
});

client.on('guildMemberRemove', member => {
    if (!member || !member.id || !member.guild) return;
    const guild = member.guild;
	
    const channel = member.guild.channels.find('name', 'log');
    if (!channel) return;
    let memberavatar = member.user.avatarURL
    const fromNow = moment(member.joinedTimestamp).fromNow();
    
    let embed = new Discord.RichEmbed()
       .setAuthor(`${member.user.tag}`, member.user.avatarURL)
	   .setThumbnail(memberavatar)
       .setColor('RED')
       .setDescription(`📤 <@${member.user.id}> **Leave From Server**\n\n`)
       .setTimestamp();
     channel.send({embed:embed});
});

client.on('messageDelete', message => {
    if (!message || !message.id || !message.content || !message.guild || message.author.bot) return;
    const channel = message.guild.channels.find('name', 'log');
    if (!channel) return;
    
    let embed = new Discord.RichEmbed()
       .setAuthor(`${message.author.tag}`, message.author.avatarURL)
       .setColor('BLACK')
       .setDescription(`🗑️ **حذف رساله**
**ارسلها <@${message.author.id}>                                                                                                                        تم حذفها في شات** <#${message.channel.id}>\n\n \`${message.cleanContent}\``)
       .setTimestamp();
     channel.send({embed:embed});

});

   





client.on('message', message => {
   if(!message.channel.guild) return;
if(message.content.startsWith('#bc')) {
if(!message.channel.guild) return message.channel.send('**هذا الأمر فقط للسيرفرات**').then(m => m.delete(5000));
if(!message.member.hasPermission('ADMINISTRATOR')) return      message.channel.send('**للأسف لا تمتلك صلاحية** `ADMINISTRATOR`' );
let args = message.content.split(" ").join(" ").slice(2 + prefix.length);
let BcList = new Discord.RichEmbed()
.setThumbnail(message.author.avatarURL)
.setAuthor(`محتوى الرساله ${args}`)
.setDescription(`برودكاست بـ امبد 📝\nبرودكاست بدون امبد✏ \nلديك دقيقه للأختيار قبل الغاء البرودكاست\nيمكنك اضافة اسم السيرفر في البرودكاست عن طريق كتابة <server>\nيمكنك اضافة اسم المرسل في البرودكاست عن طريق كتاية <by>\nيمكنك منشنة العضو في الرساله عن طريق كتابة <user>`)
if (!args) return message.reply('**يجب عليك كتابة كلمة او جملة لإرسال البرودكاست**');message.channel.send(BcList).then(msg => {
msg.react('📝')
.then(() => msg.react('✏'))
.then(() =>msg.react('📝'))
 
let EmbedBcFilter = (reaction, user) => reaction.emoji.name === '📝' && user.id === message.author.id;
let NormalBcFilter = (reaction, user) => reaction.emoji.name === '✏' && user.id === message.author.id;

let EmbedBc = msg.createReactionCollector(EmbedBcFilter, { time: 60000 });
let NormalBc = msg.createReactionCollector(NormalBcFilter, { time: 60000 });


EmbedBc.on("collect", r => {

message.channel.send(`:ballot_box_with_check: تم ارسال الرساله بنجاح`).then(m => m.delete(5000));
message.guild.members.forEach(m => {
let EmbedRep = args.replace('<server>' ,message.guild.name).replace('<user>', m).replace('<by>', `${message.author.username}#${message.author.discriminator}`)
var bc = new
Discord.RichEmbed()
.setColor('RANDOM')
.setDescription(EmbedRep)
.setThumbnail(message.author.avatarURL)
m.send({ embed: bc })
msg.delete();
})
})
NormalBc.on("collect", r => {
  message.channel.send(`:ballot_box_with_check: تم ارسال الرساله بنجاح`).then(m => m.delete(5000));
message.guild.members.forEach(m => {
let NormalRep = args.replace('<server>' ,message.guild.name).replace('<user>', m).replace('<by>', `${message.author.username}#${message.author.discriminator}`)
m.send(NormalRep);
msg.delete();
})
})
})
}
});













   
// THIS  MUST  BE  THIS  WAY
client.login(process.env.BOT_TOKEN);
