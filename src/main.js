import { ActivityType, Client, Colors, EmbedBuilder, GatewayIntentBits } from 'discord.js'
import 'dotenv/config'
import { Config, JsonDB } from 'node-json-db';

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

var db = new JsonDB(new Config("shopDB", true, true, '/'));

client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}!`);

    // Set the client user's activity
    client.user.setActivity( { type: ActivityType.Watching, name: "Arcade Shop" });

    // Get the guild 
    const guild = client.guilds.cache.get(process.env.GUILD_ID);
    if (!guild) {
        console.log('Guild not found');
        return;
    }

    // Get the channel
    const channel = guild.channels.cache.get(process.env.CHANNEL_ID);
    if (!channel) {
        console.log('Channel not found');
        return;
    }

    let settings = { method: "Get" };
    let metadata = ["Name", "Small Name", "Full Name", "Description", "Fullfillment Description", "Cost Hours", "Image URL", "Max Order Quantity", "Stock"];

    const interval = setInterval(async () => {
        fetch("https://hackclub.com/_next/data/u5a0lJC0xX1_XKg0J1bHJ/arcade/shop.json", settings)
        .then(res => res.json())
        .then(async (json) => {
            json.pageProps.availableItems.forEach(async element => {
                let item = await db.getObjectDefault(`/items/${element.id}`, null);
                if(item == null) {
                    console.log(`New item: ${element.id}`);

                    const itemEmbed = new EmbedBuilder()
                        .setColor(Colors.Green)
                        .setTitle(element["Full Name"])
                        .setDescription(`New item in the shop!`)
                        .setImage(element["Image URL"])
                        .setFooter({ text: `Updated at ${new Date().toLocaleString()}`});

                    metadata.forEach(async meta => {
                        if(meta != "Image URL" && element[meta] != null && element[meta] != undefined) {
                            try {
                                itemEmbed.addFields({ name: meta, value: String(element[meta]) });
                            } catch (error) {
                                console.error(error);
                            }
                        }
                    });
                    
                    await channel.send({ content: `@everyone`, embeds: [itemEmbed] });
                    await db.push(`/items/${element.id}`, element);
                    return;
                }
                
                // Check if the items metadata changed
                // Possible changes: Name, Small Name, Full Name, Description, Fullfillment Description, Cost Hours, Image URL, Max Order Quantity, Stock
                metadata.forEach(async meta => {
                    if(item[meta] != element[meta]) {
                        console.log(`Metadata change: ${element.id} -> ${meta}`);

                        const itemEmbed = new EmbedBuilder()
                            .setColor(Colors.Blurple)
                            .setTitle(element["Full Name"])
                            .setDescription(`Item metadata changed! (${meta}: ${element[meta]} -> ${item[meta]})`)
                            .setImage(element["Image URL"])
                            .setFooter({ text: `Updated at ${new Date().toLocaleString()}`});
                        
                        metadata.forEach(async meta => {
                            if(meta != "Image URL" && element[meta] != null && element[meta] != undefined) {
                                itemEmbed.addFields({ name: meta, value:  String(element[meta]) });
                            }
                        });

                        await channel.send({ content: `@everyone`, embeds: [itemEmbed] });
                        await db.push(`/items/${element.id}/${meta}`, element[meta]);
                    }
                });
            });


            await db.push("/shop_dump", json);
            console.log("Shop data updated");
        }).catch((err) => { console.error(err); });
    }, 60000); // every minute
});

client.login(process.env.BOT_TOKEN);