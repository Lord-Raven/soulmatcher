import { Stage, GamePhase } from "../Stage";
import { Skit, SkitType, ScriptEntry, generateSkitScript } from "../Skit";
import { FC } from "react";
import { ScreenType } from "./BaseScreen";
import { Actor } from "../Actor";
import { NovelVisualizer } from "@lord-raven/novel-visualizer";
import { Emotion } from "../Emotion";

interface StudioScreenProps {
    stage: () => Stage;
    setScreenType: (type: ScreenType) => void;
    isVerticalLayout: boolean;
}

// This screen represents the main game screen in a gameshow studio setting. The player will make some basic choices that lead to different skits and direct the flow of the game.
export const StudioScreen: FC<StudioScreenProps> = ({ stage, setScreenType, isVerticalLayout }) => {
    // This is a physical description of the studio space for SoulMatcher, a dating gameshow on which the player is a contestant.
    const studioDescription = "The studio is a vibrant and dynamic space, designed to evoke the excitement and glamour of a high-stakes dating gameshow. The stage is set with bright, colorful lights that create an energetic atmosphere, while large LED screens display dynamic backgrounds that change with each skit. The audience area is filled with enthusiastic spectators, their cheers and reactions adding to the lively ambiance. The contestant's podium is sleek and modern, equipped with interactive elements that allow the player to make choices that influence the flow of the game. Overall, the studio is a visually stimulating environment that immerses the player in the thrilling world of SoulMatcher.";

    // Generate the next skit based on the current game phase
    const generateNextSkit = (): Skit => {
        const currentPhase = stage().getCurrentPhase();
        const hostActor = stage().getHostActor();
        const playerActor = stage().getPlayerActor();
        
        switch (currentPhase) {
            case GamePhase.GAME_INTRO:
                // Advance to contestant intro phase after this skit completes
                stage().advancePhase(GamePhase.CONTESTANT_INTRO);
                return new Skit({
                    skitType: SkitType.GAME_INTRO,
                    script: [
                        new ScriptEntry({
                            speakerId: hostActor.id,
                            message: "Welcome to SoulMatcher, the ultimate dating gameshow where your choices shape your romantic destiny! Get ready to meet intriguing contestants, navigate unexpected twists, and find out if you have what it takes to win the heart of your perfect match. Let the games begin!",
                            speechUrl: '',
                            actorEmotions: { [hostActor.id]: Emotion.joy },
                        }),
                        new ScriptEntry({
                            speakerId: '',
                            message: "As you step onto the stage, the dazzling lights and roaring audience fill you with a mix of excitement and nerves. The host's charismatic voice welcomes you to the show, setting the tone for an unforgettable experience. You glance around, taking in the vibrant atmosphere of the studio, and prepare yourself for the thrilling journey ahead on SoulMatcher!",
                            speechUrl: '',
                            actorEmotions: { [hostActor.id]: Emotion.pride },
                        })
                    ],
                    presentActors: [hostActor.id, ...stage().getContestantActors().map(c => c.id)],
                    locationDescription: studioDescription,
                    locationImageUrl: ''
                });

            case GamePhase.CONTESTANT_INTRO:
                const nextContestant = stage().getNextContestantToIntroduce();
                if (nextContestant) {
                    stage().markContestantIntroduced(nextContestant.id);
                    
                    // Check if this is the last contestant
                    if (stage().allContestantsIntroduced()) {
                        stage().advancePhase(GamePhase.GROUP_INTERVIEW);
                    }
                    
                    return new Skit({
                        skitType: SkitType.CONTESTANT_INTRO,
                        script: [
                            new ScriptEntry({
                                speakerId: hostActor.id,
                                message: `Let's welcome our ${stage().saveData.gameProgress.contestantsIntroduced.length === 1 ? 'first' : 'next'} contestant to the stage... ${nextContestant.name}!`,
                                speechUrl: '',
                                actorEmotions: { [hostActor.id]: Emotion.joy },
                            }),
                            new ScriptEntry({
                                speakerId: nextContestant.id,
                                message: `Hello everyone! ${nextContestant.description}`,
                                speechUrl: '',
                                actorEmotions: { [nextContestant.id]: Emotion.joy },
                            }),
                            new ScriptEntry({
                                speakerId: hostActor.id,
                                message: `Tell us a bit about yourself, ${nextContestant.name}!`,
                                speechUrl: '',
                                actorEmotions: { [hostActor.id]: Emotion.curiosity },
                            }),
                            new ScriptEntry({
                                speakerId: nextContestant.id,
                                message: nextContestant.profile,
                                speechUrl: '',
                                actorEmotions: { [nextContestant.id]: Emotion.pride },
                            })
                        ],
                        presentActors: [hostActor.id, playerActor.id, nextContestant.id],
                        locationDescription: studioDescription,
                        locationImageUrl: ''
                    });
                }
                // Fallthrough if no contestant found (shouldn't happen)
                stage().advancePhase(GamePhase.GROUP_INTERVIEW);
                return generateNextSkit();

            case GamePhase.GROUP_INTERVIEW:
                stage().advancePhase(GamePhase.FINALIST_SELECTION);
                const allContestants = stage().getContestantActors();
                return new Skit({
                    skitType: SkitType.GROUP_INTERVIEW,
                    script: [
                        new ScriptEntry({
                            speakerId: hostActor.id,
                            message: "Now that you've met all our wonderful contestants, let's have a group discussion! This is your chance to see how they interact with each other.",
                            speechUrl: '',
                            actorEmotions: { [hostActor.id]: Emotion.joy },
                        }),
                        new ScriptEntry({
                            speakerId: '',
                            message: "The contestants engage in lively conversation, their personalities shining through as they discuss their hopes, dreams, and what they're looking for in a partner.",
                            speechUrl: '',
                            actorEmotions: {},
                        }),
                        new ScriptEntry({
                            speakerId: hostActor.id,
                            message: "Wonderful chemistry! Now, it's time for our player to make a crucial decision...",
                            speechUrl: '',
                            actorEmotions: { [hostActor.id]: Emotion.pride },
                        })
                    ],
                    presentActors: [hostActor.id, playerActor.id, ...allContestants.map(c => c.id)],
                    locationDescription: studioDescription,
                    locationImageUrl: ''
                });

            case GamePhase.FINALIST_SELECTION:
                // TODO: This phase needs player input - will be handled separately
                // For now, just create a placeholder that explains what needs to happen
                return new Skit({
                    skitType: SkitType.GROUP_INTERVIEW,
                    script: [
                        new ScriptEntry({
                            speakerId: hostActor.id,
                            message: "Please select your three finalists! This is a crucial decision that will shape the rest of the game.",
                            speechUrl: '',
                            actorEmotions: { [hostActor.id]: Emotion.neutral },
                        })
                    ],
                    presentActors: [hostActor.id, playerActor.id],
                    locationDescription: studioDescription,
                    locationImageUrl: ''
                });

            case GamePhase.FINALIST_ONE_ON_ONE:
                const nextFinalist = stage().getNextFinalistToInterview();
                if (nextFinalist) {
                    stage().markFinalistInterviewed(nextFinalist.id);
                    
                    // Check if this is the last finalist
                    if (stage().allFinalistsInterviewed()) {
                        stage().advancePhase(GamePhase.FINAL_VOTING);
                    }
                    
                    return new Skit({
                        skitType: SkitType.FINALIST_ONE_ON_ONE,
                        script: [
                            new ScriptEntry({
                                speakerId: hostActor.id,
                                message: `Time for a one-on-one with ${nextFinalist.name}! You two will have some private time to get to know each other better.`,
                                speechUrl: '',
                                actorEmotions: { [hostActor.id]: Emotion.joy },
                            }),
                            new ScriptEntry({
                                speakerId: nextFinalist.id,
                                message: `I'm so excited for this opportunity to connect with you on a deeper level.`,
                                speechUrl: '',
                                actorEmotions: { [nextFinalist.id]: Emotion.love },
                            }),
                            new ScriptEntry({
                                speakerId: '',
                                message: `The two of you share an intimate conversation, exploring common interests and building a genuine connection.`,
                                speechUrl: '',
                                actorEmotions: { [nextFinalist.id]: Emotion.joy, [playerActor.id]: Emotion.joy },
                            })
                        ],
                        presentActors: [playerActor.id, nextFinalist.id],
                        locationDescription: "A cozy, intimate setting with soft lighting and comfortable seating, perfect for getting to know someone better.",
                        locationImageUrl: ''
                    });
                }
                // Fallthrough if no finalist found
                stage().advancePhase(GamePhase.FINAL_VOTING);
                return generateNextSkit();

            case GamePhase.FINAL_VOTING:
                // TODO: This phase needs voting logic - will be handled separately
                stage().advancePhase(GamePhase.GAME_COMPLETE);
                return new Skit({
                    skitType: SkitType.RESULTS,
                    script: [
                        new ScriptEntry({
                            speakerId: hostActor.id,
                            message: "The moment of truth has arrived! It's time to reveal who has won the heart of our contestant!",
                            speechUrl: '',
                            actorEmotions: { [hostActor.id]: Emotion.joy },
                        })
                    ],
                    presentActors: [hostActor.id, playerActor.id, ...stage().saveData.gameProgress.finalistIds.map(id => id)],
                    locationDescription: studioDescription,
                    locationImageUrl: ''
                });

            case GamePhase.GAME_COMPLETE:
                return new Skit({
                    skitType: SkitType.RESULTS,
                    script: [
                        new ScriptEntry({
                            speakerId: hostActor.id,
                            message: "Thank you for playing SoulMatcher! What an incredible journey this has been!",
                            speechUrl: '',
                            actorEmotions: { [hostActor.id]: Emotion.joy },
                        })
                    ],
                    presentActors: [hostActor.id, playerActor.id],
                    locationDescription: studioDescription,
                    locationImageUrl: '',

                });

            default:
                return new Skit({
                    skitType: SkitType.GAME_INTRO,
                    script: [],
                    presentActors: [],
                    locationDescription: studioDescription,
                    locationImageUrl: ''
                });
        }
    };

    // Handler for when the submit button is pressed in NovelVisualizer. At this point, if the user had input, it has been spliced into the script.
    const handleSubmit = async (input: string, skit: any, index: number) => {
        if (input.trim() === '' && index < (skit as Skit).script.length - 1) {
            console.log('No input and more skit to display; no action needed.');
            return;
        } else if (input.trim() === '' && (skit as Skit).script[index].endScene) {
            console.log('No input and skit complete; proceed to next phase or whatever.');
            const currentPhase = stage().getCurrentPhase();

            // Phases that need external UI for player input
            const needsPlayerInput = [
                GamePhase.FINALIST_SELECTION,
                GamePhase.FINAL_VOTING
            ];
            
            if (needsPlayerInput.includes(currentPhase)) {
                // TODO: Show selection UI instead of generating new skit
                console.log(`Phase ${currentPhase} requires player input - not generating new skit yet`);
                return;
            }
            
            // Generate and add the next skit
            const nextSkit = await generateNextSkit();
            stage().saveData.skits.push(nextSkit);
            stage().saveGame();
            console.log(`Generated new skit for phase: ${stage().getCurrentPhase()}`);

            return;
        } else {
            console.log('Skit not over; generate more script.');
            const nextEntries = await generateSkitScript(skit as Skit, stage());
            (skit as Skit).script.push(...nextEntries.entries);
            stage().saveGame();
            console.log('Generated additional skit content after empty input.');
            return;
        }
    };
    
    // Returns the last emotion for the given actor in the skit up to the current index, or neutral if none found.
    const determineEmotion = (actorId: string, skit: Skit, index: number): Emotion => {
        let emotion = Emotion.neutral;
        for (let i = index; i >= 0; i--) {
            const line = skit.script[i];
            if (line && line.actorEmotions && line.actorEmotions[actorId]) {
                emotion = line.actorEmotions[actorId];
                break;
            }
        }
        return emotion;
    }
    
    let skit = stage().getCurrentSkit();

    // If no skit exists, generate the first one
    if (!skit) {
        skit = generateNextSkit();
        stage().saveData.skits.push(skit);
        stage().saveGame();
        console.log("Initialized first skit for StudioScreen.");
        console.log(skit);
    } else {
        console.log("Current skit for StudioScreen:", skit);
    }

    return (<div>
        {(skit && skit.script) ? <NovelVisualizer
            script={skit}
            getBackgroundImageUrl={(script, index: number) => {return (script as Skit).locationImageUrl || ''}}
            isVerticalLayout={isVerticalLayout}
            actors={stage().saveData.actors}
            playerActorId={stage().getPlayerActor().id}
            getPresentActors={(script, index: number) => (script as Skit).presentActors?.map(actorId => stage().saveData.actors[actorId]).filter(actor => actor) || []}
            getActorImageUrl={(actor, script, index: number) => {return (actor as Actor).emotionPack[determineEmotion((actor as Actor).id, script as Skit, index)];}}
            onSubmitInput={handleSubmit}
            enableAudio={!stage().saveData.disableTextToSpeech}
            enableGhostSpeakers={true}
            enableTalkingAnimation={true}
        /> : <></>}
    </div>
    );
}