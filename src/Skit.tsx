import { Actor, findBestNameMatch } from "./Actor";
import { Emotion, EMOTION_MAPPING } from "./Emotion";
import { Stage } from "./Stage";

export enum SkitType {
    GAME_INTRO = 'GAME_INTRO',
    CONTESTANT_INTRO = 'CONTESTANT_INTRO',
    GROUP_INTERVIEW = 'GROUP_INTERVIEW',
    FINALIST_ONE_ON_ONE = 'FINALIST_ONE_ON_ONE',
    RESULTS = 'RESULTS',
}

function getSkitTypePrompt(skitType: SkitType, stage: Stage, skit: Skit): string {
    const player = stage.getPlayerActor();
    const host = stage.getHostActor();
    const save = stage.saveData;
    
    // Get the target contestant (present actor that isn't the player or host)
    const presentActorIds = skit.presentActors;
    const targetContestants = Object.values(save.actors).filter(a => 
        presentActorIds.includes(a.id) && a.id !== player.id && a.id !== host.id
    );
    const targetContestant = targetContestants.length > 0 ? targetContestants[0] : null;

    switch (skitType) {
        case SkitType.GAME_INTRO:
            return 'This is the opening scene of the dating gameshow. Cupid is introducing the format of the game, the stakes, and the player character to the audience and contestants. The tone should be exciting, theatrical, and set expectations for the matchmaking journey ahead.';
        
        case SkitType.CONTESTANT_INTRO:
            if (targetContestant) {
                return `A contestant, ${targetContestant.name}, is being introduced to the player and audience. ${targetContestant.name}'s profile shows they are: ${targetContestant.description}. This scene should showcase ${targetContestant.name}'s personality, charm, and what makes them a compelling potential match. There's an opportunity for initial sparks of connection or interesting dynamics to emerge.`;
            }
            return 'A contestant is being introduced to the player and audience. This scene should showcase the contestant\'s personality, charm, and what makes them a compelling potential match. There\'s an opportunity for initial sparks of connection or interesting dynamics to emerge.';
        
        case SkitType.GROUP_INTERVIEW:
            return 'The player is interviewing multiple contestants together in a group setting. This scene involves dynamic interactions between the candidates, opportunities for them to compete or cooperate, and moments where the player can gauge compatibility with each one. Group chemistry and individual personalities come into play.';
        
        case SkitType.FINALIST_ONE_ON_ONE:
            if (targetContestant) {
                return `The player is in a private, intimate moment with ${targetContestant.name}, one of the finalists. ${targetContestant.name}'s profile shows: ${targetContestant.description}. This scene is more personal and romantic than previous interactions, allowing for deeper conversation, vulnerability, and genuine connection. This is a pivotal moment to explore whether ${targetContestant.name} could truly be ${player.name}'s soulmate.`;
            }
            return 'The player is in a private, intimate moment with one of the finalists. This scene is more personal and romantic than previous interactions, allowing for deeper conversation, vulnerability, and genuine connection. This is a pivotal moment to explore whether this could be a real match.';
        
        case SkitType.RESULTS:
            return 'The game is reaching its climax. Voting results are being revealed, eliminations are happening, and tension builds as the player discovers who the audience, other contestants, and Cupid believe could be their perfect soulmate. The tone is dramatic and emotionally charged.';
        
        default:
            return 'An event is unfolding in the gameshow.';
    }
}

/**
 * Generate a deterministic ID for a skit based on its type and context.
 * This ensures each skit has a unique, reproducible ID that represents its exact place in the game.
 */
export function generateSkitId(skitType: SkitType, contextActorId?: string): string {
    switch (skitType) {
        case SkitType.GAME_INTRO:
            return 'skit-GAME_INTRO';
        case SkitType.CONTESTANT_INTRO:
            return `skit-CONTESTANT_INTRO-${contextActorId}`;
        case SkitType.GROUP_INTERVIEW:
            return 'skit-GROUP_INTERVIEW';
        case SkitType.FINALIST_ONE_ON_ONE:
            return `skit-FINALIST_ONE_ON_ONE-${contextActorId}`;
        case SkitType.RESULTS:
            return 'skit-RESULTS';
        default:
            return `skit-UNKNOWN-${Date.now()}`;
    }
}

export class Skit {
    id: string = '';
    skitType: SkitType = SkitType.GAME_INTRO;
    script: ScriptEntry[] = [];
    presentActors: string[] = []; // List of Actor IDs present in this skit
    locationDescription: string = '';
    locationImageUrl: string = '';
    
    constructor(props: any) {
        Object.assign(this, props);
        // Generate ID if not provided, using the first non-host/non-player actor as context
        if (!this.id) {
            this.id = generateSkitId(this.skitType, this.presentActors?.[0]);
        }
    }
}

export class ScriptEntry {
    speakerId: string = ''; // Actor ID of speaker
    message: string = ''; // Message content for this script entry
    speechUrl: string = ''; // Optional URL for text-to-speech audio
    actorEmotions: {[key: string]: Emotion} = {}; // Map of emotion changes by actor ID
    endScene?: boolean = false; // Optional flag to indicate if this entry ends the scene
    
    constructor(props: any) {
        Object.assign(this, props);
    }
}

function buildScriptLog(stage: Stage, skit: Skit, additionalEntries: ScriptEntry[] = []): string {
        return ((skit.script && skit.script.length > 0) || additionalEntries.length > 0) ?
            [...skit.script, ...additionalEntries].map(e => {
                // Find the best matching emotion key for this speaker
                const emotionKeys = Object.keys(e.actorEmotions || {});
                const speaker = stage.saveData.actors[e.speakerId]?.name || e.speakerId;
                const candidates = emotionKeys.map(key => ({ name: key }));
                const bestMatch = findBestNameMatch(speaker, candidates);
                const matchingKey = bestMatch?.name;
                const emotionText = matchingKey ? ` [${matchingKey} EXPRESSES ${e.actorEmotions?.[matchingKey]}]` : '';
                return `${speaker}:${e.message}${emotionText}`;
            }).join('\n')
            : '(None so far)';
}

export function generateSkitPrompt(skit: Skit, stage: Stage, historyLength: number, instruction: string): string {
    const player = stage.getPlayerActor();
    const host = stage.getHostActor();
    const save = stage.saveData;

    // Determine present and absent actors for this moment in the skit (as of the last entry in skit.script):
    const presentActorIds = skit.presentActors;
    const presentActors = Object.values(save.actors).filter(a => presentActorIds.includes(a.id));
    const absentActors = Object.values(save.actors).filter(a => !presentActorIds.includes(a.id));


    // Get past skits in chronological order, excluding the current skit
    let pastSkits = stage.getSkitsInOrder().filter(s => s.id !== skit.id);
    // Get the last N skits for history
    pastSkits = pastSkits.slice(Math.max(0, pastSkits.length - historyLength));

    let fullPrompt = `{{messages}}\nPremise:\nThis is an interactive visual novel depicting a modern dating gameshow hosted by the actual Roman god of love, Cupid.` +
        `The game positions the player character, ${player.name}, as the primary contestant interviewing a number of candidate love interests. After a couple rounds of interviews, ${player.name}, the audience, and Cupid himself will ` +
        `vote on the candidate they think should become ${player.name}'s soulmate, and then Cupid will shoot them both and seal the deal.` +
        `\n\n${player.name}'s profile: ${player.description}` +
        `\n\nCupid's profile: ${host.description}` +
        
        `\n\nScene Prompt:\n  ${getSkitTypePrompt(skit.skitType, stage, skit)}` +
        
        ((historyLength > 0 && pastSkits.length) ? 
                // Include last few skit scripts for context and style reference
                '\n\nRecent Events for additional context:' + pastSkits.map((v, index) =>  {
                if (v && v.script && v.script.length > 0) {
                    return `\n\n  Script of previous skit:\n${buildScriptLog(stage, v)}`;
                }
            }).join('') : '') +

        // List characters who are here, along with full stat details:
        `\n\nParticipating Candidates:\n${presentActors.filter(actor => actor != stage.getPlayerActor() && actor != stage.getHostActor()).map(actor => {
            return `  ${actor.name}\n    Description: ${actor.description}\n    Profile: ${actor.profile}\n`}).join('\n')}` +
        `\n\nOther Candidates:\n${absentActors.filter(actor => actor != stage.getPlayerActor() && actor != stage.getHostActor()).map(actor => {
            return `  ${actor.name}\n    Description: ${actor.description}\n    Profile: ${actor.profile}\n`}).join('\n')}` +
        `\n\n${instruction}`;
    return fullPrompt;
}


export async function generateSkitScript(skit: Skit, stage: Stage): Promise<{ entries: ScriptEntry[]; endScene: boolean}> {

    // Retry logic if response is null or response.result is empty
    let retries = 3;
    while (retries > 0) {
        try {
            const fullPrompt = generateSkitPrompt(skit, stage, 5 + retries * 5, // Start with lots of history, reducing each iteration.
                `Example Script Format:\n` +
                    `CHARACTER NAME: Character Name does some actions in prose; for example, they may be waving to you, the player. They say, "My dialogue is in quotation marks."\n` +
                    `CHARACTER NAME: [CHARACTER NAME EXPRESSES PRIDE] "A character can have two entries in a row, if they have more to say or do or it makes sense to break up a lot of activity."\n` +
                    `ANOTHER CHARACTER NAME: [ANOTHER CHARACTER NAME EXPRESSES JOY][CHARACTER NAME EXPRESSES SURPRISE] ` +
                        `"Other character expressions can update in each other's entries—say, if they're reacting to something the speaker says—, but only the named character can speak in each entry."\n` +
                    `CHARACTER NAME: They nod in agreement, "If there's any dialogue at all, the entry must be attributed to the character speaking."\n` +
                    `NARRATOR: [CHARACTER NAME EXPRESSES RELIEF] Descriptive content or other scene events occurring around you, the player, can be attributed to NARRATOR. Dialogue cannot be included in NARRATOR entries.\n` +
                    `${stage.getPlayerActor().name.toUpperCase()}: "Hey, Character Name," I greet them warmly. I'm the player, and my entries use first-person narrative voice, while all other skit entries use second-person to refer to me.\n` +
                    `\n\n` +
                `Current Scene Script Log to Continue:\n${buildScriptLog(stage, skit)}` +
                `\n\nPrimary Instruction:\n` +
                `  ${skit.script.length == 0 ? 'Produce the initial moments of a scene (perhaps joined in medias res)' : 'Extend or conclude the current scene script'} with three to five entries, ` +
                `based upon the Premise and the specified Scene Prompt. Primarily involve the Present Characters, although Absent Characters may be moved to this location using appropriate tags. ` +
                `The script should consider characters' stats, relationships, past events, and the station's stats—among other factors—to craft a compelling scene. ` +
                `\n\n  Follow the structure of the strict Example Script formatting above: ` +
                `actions are depicted in prose and character dialogue in quotation marks. Characters present their own actions and dialogue, while other events within the scene are attributed to NARRATOR. ` +
                `Although a loose script format is employed, the actual content should be professionally edited narrative prose. ` +
                `Entries from the player, ${stage.getPlayerActor().name}, are written in first-person, while other entries consistently refer to ${stage.getPlayerActor().name} in second-person; all other characters are referred to in third-person, even in their own entries.` +
                `\n\nTag Instruction:\n` +
                `  Embedded within this script, you may employ special tags to trigger various game mechanics. ` +
                `\n\n  Emotion tags ("[CHARACTER NAME EXPRESSES JOY]") should be used to indicate visible emotional shifts in a character's appearance using a single-word emotion name. ` +
                `\n\nThis scene is a brief visual novel skit within a video game; as such, the scene avoids major developments which would fundamentally alter the mechanics or nature of the game, ` +
                `instead developing content within the existing rules. ` +
                `As a result, avoid timelines or concrete, countable values throughout the skit, using vague durations or amounts for upcoming events; the game's mechanics may by unable to map directly to what is depicted in the skit, so ambiguity is preferred. ` +
                `Generally, focus upon interpersonal dynamics, character growth, faction and patient relationships, and the state of the Station, its capabilities, and its inhabitants.` +
                ((stage.saveData.language || 'English').toLowerCase() !== 'english' ? `\n\nNote: The game is now being played in ${stage.saveData.language}. Regardless of historic language use, generate this skit content in ${stage.saveData.language} accordingly. Special emotion and movement tags continue to use English (these are invisible to the user).` : '')
            );

            const response = await stage.generator.textGen({
                prompt: fullPrompt,
                min_tokens: 10,
                max_tokens: 500,
                include_history: true,
                stop: []
            });
            if (response && response.result && response.result.trim().length > 0) {
                // First, detect and parse any tags that may be embedded in the response.
                let text = response.result;
                let endScene = false;

                // Strip double-asterisks. TODO: Remove this once other model issue is resolved.
                text = text.replace(/\*\*/g, '');

                // Remove any initial "System:" prefix
                if (text.toLowerCase().startsWith('system:')) {
                    text = text.slice(7).trim();
                }

                // Parse response based on format "NAME: content"; content could be multi-line. We want to ensure that lines that don't start with a name are appended to the previous line.
                const lines = text.split('\n');
                const combinedLines: string[] = [];
                const combinedEmotionTags: {emotions: {[key: string]: Emotion}, movements: {[actorId: string]: string}}[] = [];
                let currentLine = '';
                let currentEmotionTags: {[key: string]: Emotion} = {};
                let currentMovements: {[actorId: string]: string} = {};
                for (const line of lines) {
                    // Skip empty lines
                    let trimmed = line.trim();

                    // If a line doesn't end with ], ., !, ?, or ", then it's likely incomplete and we should drop it.
                    if (!trimmed || ![']', '*', '_', ')', '.', '!', '?', '"', '\''].some(end => trimmed.endsWith(end))) continue;

                    const newEmotionTags: {[key: string]: Emotion} = {};
                    const newMovements: {[actorId: string]: string} = {};

                    // Prepare list of all actors (not just present)
                    const allActors: Actor[] = Object.values(stage.saveData.actors);
                    
                    // Process tags in the line
                    for (const tag of trimmed.match(/\[[^\]]+\]/g) || []) {
                        const raw = tag.slice(1, -1).trim();
                        if (!raw) continue;

                        console.log(`Processing tag: ${raw}`);
                        
                        // Look for expresses tags:
                        const emotionTagRegex = /([^[\]]+)\s+EXPRESSES\s+([^[\]]+)/gi;
                        let emotionMatch = emotionTagRegex.exec(raw);
                        if (emotionMatch) {
                            const characterName = emotionMatch[1].trim();
                            const emotionName = emotionMatch[2].trim().toLowerCase();
                            // Find matching actor using findBestNameMatch
                            const matched = findBestNameMatch(characterName, allActors);
                            if (!matched) continue;
                            
                            // Try to map emotion using EMOTION_SYNONYMS if not a standard emotion
                            let finalEmotion: Emotion | undefined;
                            if (emotionName in Emotion) {
                                finalEmotion = emotionName as Emotion;
                                console.log(`Recognized standard emotion "${finalEmotion}" for ${matched.name}`);
                            } else if (emotionName in EMOTION_MAPPING) {
                                finalEmotion = EMOTION_MAPPING[emotionName];
                                console.log(`Mapped non-standard emotion "${emotionName}" to "${finalEmotion}" for ${matched.name}`);
                            } else {
                                console.warn(`Unrecognized emotion "${emotionName}" for ${matched.name}; skipping tag.`);
                            }
                            
                            if (!finalEmotion) continue;
                            newEmotionTags[matched.name] = finalEmotion;
                        }
                    }

                    // Remove all tags:
                    trimmed = trimmed.replace(/\[([^\]]+)\]/g, '').trim();

                    if (line.includes(':')) {
                        // New line
                        if (currentLine) {
                            combinedLines.push(currentLine.trim());
                            combinedEmotionTags.push({
                                emotions: currentEmotionTags,
                                movements: currentMovements
                            });
                        }
                        currentLine = trimmed;
                        currentEmotionTags = newEmotionTags;
                        currentMovements = newMovements;
                    } else {
                        // Continuation of previous line
                        currentLine += '\n' + trimmed;
                        currentEmotionTags = {...currentEmotionTags, ...newEmotionTags};
                        currentMovements = {...currentMovements, ...newMovements};
                    }
                }
                if (currentLine) {
                    combinedLines.push(currentLine.trim());
                    combinedEmotionTags.push({
                        emotions: currentEmotionTags,
                        movements: currentMovements
                    });
                }

                // Convert combined lines into ScriptEntry objects by splitting at first ':'
                const scriptEntries: ScriptEntry[] = combinedLines.map((l, index) => {
                    const idx = l.indexOf(':');
                    let speakerName = 'NARRATOR';
                    let message = l;
                    
                    if (idx !== -1) {
                        speakerName = l.slice(0, idx).trim();
                        message = l.slice(idx + 1).trim();
                    }

                    const speaker = findBestNameMatch(speakerName, Object.values(stage.saveData.actors)) || null;
                    
                    // Remove any remaining tags
                    message = message.replace(/\[([^\]]+)\]/g, '').trim();
                    
                    const tagData = combinedEmotionTags[index];
                    const entry: ScriptEntry = { speakerId: speaker?.id || '', message, speechUrl: '', actorEmotions: tagData.emotions  };
                    
                    return entry;
                });

                // Drop empty entries from scriptEntries and adjust speaker to any matching actor's name:
                for (const entry of scriptEntries) {
                    if (!entry.message || entry.message.trim().length === 0) {
                        scriptEntries.splice(scriptEntries.indexOf(entry), 1);
                        continue;
                    }
                }

                // TTS for each entry's dialogue
                const ttsPromises = scriptEntries.map(async (entry) => {
                    const actor = stage.saveData.actors[entry.speakerId] || null;
                    // Only TTS if entry.speaker matches an actor from stage().getSave().actors and entry.message includes dialogue in quotes.
                    if (!actor || !entry.message.includes('"') || stage.saveData.disableTextToSpeech) {
                        entry.speechUrl = '';
                        return;
                    }
                    let transcript = entry.message.split('"').filter((_, i) => i % 2 === 1).join('.........').trim();
                    // Strip asterisks or other markdown-like emphasis characters
                    transcript = transcript.replace(/[\*_~`]+/g, '');
                    try {
                        const ttsResponse = await stage.generator.speak({
                            transcript: transcript,
                            voice_id: actor.voiceId ?? undefined
                        });
                        if (ttsResponse && ttsResponse.url) {
                            entry.speechUrl = ttsResponse.url;
                        } else {
                            entry.speechUrl = '';
                        }
                    } catch (err) {
                        console.error('Error generating TTS:', err);
                        entry.speechUrl = '';
                    }
                });

                // Run a prompt to detect whether the script has reached a natural conclusion or scene change. Add the promise to the ttsPromises so it runs concurrently.
                const sceneCompletionPromise = (async () => {
                    if (!skit.script || skit.script.length === 0) {
                        // Don't check for completion on the first generation
                        return;
                    }
                    
                    const completionPrompt = `{{messages}}\nYou are analyzing a scene from a dating gameshow visual novel to determine if it has reached a natural conclusion.\n\n` +
                        `Scene Context:\n${getSkitTypePrompt(skit.skitType, stage, skit)}\n\n` +
                        `Full Scene Script:\n${buildScriptLog(stage, skit, scriptEntries)}\n\n` +
                        `Question: Has this scene fulfilled its narrative purpose and reached a natural conclusion or transition point where the show should move to the next phase?\n\n` +
                        `Respond with exactly one of these terms:\n` +
                        `- SCENE_COMPLETE if the scene has reached a satisfying conclusion, resolved its main purpose, or hit a clear transition point\n` +
                        `- SCENE_CONTINUES if the scene still has meaningful developments to explore or feels incomplete\n\n` +
                        `Begin the response with the appropriate term, followed by "###" and a brief explanation of your reasoning.`;
                    
                    try {
                        const response = await stage.generator.textGen({
                            prompt: completionPrompt,
                            min_tokens: 1,
                            max_tokens: 20,
                            include_history: false,
                            stop: ['###'] // Don't really want reasoning; gaslighting the LLM into holding off on explaining until after the stopping string.
                        });
                        
                        if (response && response.result) {
                            const result = response.result.trim().toUpperCase();
                            if (result.includes('SCENE_COMPLETE')) {
                                console.log('Scene completion detected by LLM');
                                endScene = true;
                            } else {
                                console.log('Scene continues per LLM analysis');
                            }
                        }
                    } catch (error) {
                        console.error('Error checking scene completion:', error);
                    }
                })();
                
                ttsPromises.push(sceneCompletionPromise);

                // Wait for all TTS generation and scene completion check to complete
                await Promise.all(ttsPromises);

                // Attach endScene and endProperties to the final entry if the scene ended
                if (endScene && scriptEntries.length > 0) {
                    const finalEntry = scriptEntries[scriptEntries.length - 1];
                    finalEntry.endScene = true;
                }

                return { entries: scriptEntries, endScene: endScene };
            }
        } catch (error) {
            console.error('Error generating skit script:', error);
        }
        retries--;
    }
    return { entries: [], endScene: false };
}