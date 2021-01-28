const { MessageEmbed } = require('discord.js');
const { prefix } = require('../json/config.json');
const ms = require("ms");
const PrettyMS = require('pretty-ms');
const alreadyUsed = new Set();

module.exports = {
    name: "clases",
    aliases: [],
    description: "Ver clases activas",
    category: "utilidad",
    cooldown: 60000,
    format: `${prefix}clases <m/t>`,
    run: async (client, message, argumentos) => {
        if(!message.content.startsWith(prefix)) return;
        
        if(alreadyUsed.has(message.author.id)) {
            return message.channel.send("Aguanta un poco, recien preguntaste").then(m => m.delete({timeout: 5000}));
        }
        else {
            alreadyUsed.add(message.author.id);
            setTimeout(() => {
                alreadyUsed.delete(message.author.id)
            },this.cooldown);
        }

        var conn = await client.functions.get("dbconnection").run();
        if(!conn) return message.channel.send("No connection available.");

        var date = new Date(),
            info = {
                day: date.getDay().toString(),
                nowMS: ms(date.getHours()+"h") + ms(date.getMinutes()+"m") + ms(date.getSeconds()+"s"),
            }

        var qry = `SELECT * FROM \`clases\` WHERE fromMS <= ${info.nowMS} AND toMS > ${info.nowMS} AND \`dias\` LIKE '%${info.day}%'`
        if(argumentos[0]) {
            if(["t","m"].includes(argumentos[0].toLowerCase())) qry += ` AND turno = '${argumentos[0].toLowerCase()}'`;
        }
        
        conn.query(qry, (err, rows, fields) => {
            conn.end();
            if(err) {
                console.error(err);
                return message.channel.send("error");
            }

            if(!rows.length) return message.channel.send("No se han encontrado clases.");

            var embed = new MessageEmbed()
            .setColor("#5cd15c")
            .setAuthor("Clases activas", client.user.displayAvatarURL())
            .setTitle(`Clases activas: ${rows.length}`)
            .setTimestamp()
            .setThumbnail("https://stfainfo.ch/images/livetickerstate/live.gif")
            .setFooter("🟢 activa 🟡 culminando");

            for(i = 0; i < rows.length; i++) {
                let horario = rows[i].horario.split("|");

                if(horario[0].includes(".")) {
                    let primer_horario = horario[0].split(".");
                    from = ms(primer_horario[0]) + ms(primer_horario[1]);
                } else {
                    from = ms(horario[0]);
                }

                if(horario[1].includes(".")) {
                    let seg_horario = horario[1].split(".");
                    to = ms(seg_horario[0]) + ms(seg_horario[1]);
                } else {
                    to = ms(horario[1]);
                }
                
                let emoji = (rows[i].toMS - info.nowMS) <= 600000 ? "<:culminando:804416039273889882>" : "<:online:804069579579850823>";

                embed.addField(`${rows[i].materia.toUpperCase()} ${rows[i].tipo.toUpperCase()} ${rows[i].turno.toUpperCase()} ${rows[i].comisiones}`,
                `${emoji} [Clic para ir al link](${rows[i].link}). Contraseña: ${rows[i].password}`+
                `\nProfesor/a ${rows[i].profesor} // ${PrettyMS(from, {colonNotation: true})}-${PrettyMS(to, {colonNotation: true})}`);
            }

            return message.channel.send(embed);

        })
    }
}