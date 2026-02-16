import { Stage, GamePhase } from "../Stage";
import { Skit, SkitType, generateSkitScript } from "../Skit";
import { FC, useState } from "react";
import { ScreenType } from "./BaseScreen";
import { Actor } from "../Actor";
import { NovelVisualizer } from "@lord-raven/novel-visualizer";
import { Emotion } from "../Emotion";
import { Box } from "@mui/material";
import { LastPage, PlayArrow } from "@mui/icons-material";
import { CandidateSelectionUI } from "./CandidateSelectionUI";

interface StudioScreenProps {
    stage: () => Stage;
    setScreenType: (type: ScreenType) => void;
    isVerticalLayout: boolean;
}

// This screen represents the main game screen in a gameshow studio setting. The player will make some basic choices that lead to different skits and direct the flow of the game.
export const StudioScreen: FC<StudioScreenProps> = ({ stage, setScreenType, isVerticalLayout }) => {
    const [showSelectionUI, setShowSelectionUI] = useState(false);
    
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
                    script: [],
                    presentActors: [hostActor.id],
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
                        script: [],
                        presentActors: [nextContestant.id],
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
                    script: [],
                    presentActors: [...allContestants.map(c => c.id)],
                    locationDescription: studioDescription,
                    locationImageUrl: ''
                });

            case GamePhase.FINALIST_SELECTION:
                // TODO: This phase needs player input - will be handled separately
                // For now, just create an empty skit
                return new Skit({
                    skitType: SkitType.GROUP_INTERVIEW,
                    script: [],
                    presentActors: [hostActor.id],
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
                        script: [],
                        presentActors: [nextFinalist.id],
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
                    script: [],
                    presentActors: [...stage().saveData.gameProgress.finalistIds.map(id => id)],
                    locationDescription: studioDescription,
                    locationImageUrl: ''
                });

            case GamePhase.GAME_COMPLETE:
                return new Skit({
                    skitType: SkitType.RESULTS,
                    script: [],
                    presentActors: [hostActor.id],
                    locationDescription: studioDescription,
                    locationImageUrl: ''
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
            return skit;
        } else if (input.trim() === '' && (skit as Skit).script[index].endScene) {
            console.log('No input and skit complete; proceed to next phase or whatever.');
            const currentPhase = stage().getCurrentPhase();

            // Phases that need external UI for player input
            const needsPlayerInput = [
                GamePhase.FINALIST_SELECTION,
                GamePhase.FINAL_VOTING
            ];
            
            if (needsPlayerInput.includes(currentPhase)) {
                // Show selection UI instead of generating new skit
                console.log(`Phase ${currentPhase} requires player input - showing selection UI`);
                setShowSelectionUI(true);
                return skit; // Reconsider this.
            }
            
            // Generate the next skit and generate its initial script before returning
            const nextSkit = generateNextSkit();
            const scriptResult = await generateSkitScript(nextSkit, stage());
            nextSkit.script.push(...scriptResult.entries);
            stage().addSkit(nextSkit);
            stage().saveGame();
            console.log(`Generated new skit for phase: ${stage().getCurrentPhase()}`);

            return nextSkit;
        } else {
            console.log('Skit not over; generate more script.');
            const nextEntries = await generateSkitScript(skit as Skit, stage());
            (skit as Skit).script.push(...nextEntries.entries);
            stage().saveGame();
            console.log('Generated additional skit content after empty input.');
            return skit;
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

    // Handler for when candidates are selected during selection phases
    const handleCandidateSelection = async (selectedIds: string[]) => {
        const currentPhase = stage().getCurrentPhase();
        
        if (currentPhase === GamePhase.FINALIST_SELECTION) {
            // Save the finalists and advance to one-on-one interviews
            stage().setFinalists(selectedIds);
            stage().advancePhase(GamePhase.FINALIST_ONE_ON_ONE);
            setShowSelectionUI(false);
            
            // Generate the first finalist interview skit
            const nextSkit = generateNextSkit();
            const scriptResult = await generateSkitScript(nextSkit, stage());
            nextSkit.script.push(...scriptResult.entries);
            stage().addSkit(nextSkit);
            stage().saveGame();
            console.log('Generated first finalist one-on-one skit');
        } else if (currentPhase === GamePhase.FINAL_VOTING) {
            // Save the player's final choice
            stage().setPlayerChoice(selectedIds[0]);
            stage().advancePhase(GamePhase.GAME_COMPLETE);
            setShowSelectionUI(false);
            
            // Generate the results skit
            const nextSkit = generateNextSkit();
            const scriptResult = await generateSkitScript(nextSkit, stage());
            nextSkit.script.push(...scriptResult.entries);
            stage().addSkit(nextSkit);
            stage().saveGame();
            console.log('Generated results skit after final voting');
        }
    };
    
    let skit = stage().getCurrentSkit();

    if (skit) {
        console.log("Current skit for StudioScreen:", skit);
    }

    const currentPhase = stage().getCurrentPhase();
    
    // Show selection UI for finalist selection and final voting phases
    if (showSelectionUI) {
        const candidates = currentPhase === GamePhase.FINALIST_SELECTION 
            ? stage().getContestantActors()
            : stage().saveData.gameProgress.finalistIds.map(id => stage().saveData.actors[id]).filter(actor => actor) as Actor[];
        
        const maxSelections = currentPhase === GamePhase.FINALIST_SELECTION ? 3 : 1;
        
        const scenarioTitle = currentPhase === GamePhase.FINALIST_SELECTION 
            ? "Choose Your Finalists"
            : "Make Your Final Choice";
        
        const scenarioDescription = currentPhase === GamePhase.FINALIST_SELECTION
            ? "You've met all the candidates. Now it's time to choose the three people you'd like to get to know better in one-on-one interviews."
            : "After your interviews with the finalists, it's time to make your ultimate choice. Who has stolen your heart?";

        return (
            <CandidateSelectionUI
                candidates={candidates}
                maxSelections={maxSelections}
                onContinue={handleCandidateSelection}
                scenarioTitle={scenarioTitle}
                scenarioDescription={scenarioDescription}
                isVerticalLayout={isVerticalLayout}
            />
        );
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
            getSubmitButtonConfig={(script, index, inputText) => {
                const scriptLength = (script as Skit).script.length;
                const endScene = (script as Skit).script[index]?.endScene || false;
                return {
                    label: endScene ? 'Next Round' : (scriptLength > 0 ? 'Continue' : 'Start'),
                    enabled: true,
                    colorScheme: endScene ? 'error' : 'primary',
                    icon: endScene ? <LastPage/> : <PlayArrow/>
                }
            }}
            enableAudio={!stage().saveData.disableTextToSpeech}
            enableGhostSpeakers={true}
            enableTalkingAnimation={true}
            renderActorHoverInfo={(actor) => {
                if (!actor) return null;
                const typedActor = actor as Actor;
                return (
                    <Box
                        sx={{
                            padding: 2,
                            backgroundColor: 'rgba(0, 0, 0, 0.85)',
                            borderRadius: 2,
                            border: `2px solid ${typedActor.themeColor || '#ffffff'}`,
                            maxWidth: 300,
                        }}
                    >
                        <Box
                            component="h3"
                            sx={{
                                margin: 0,
                                marginBottom: 1,
                                color: typedActor.themeColor || '#ffffff',
                                fontFamily: typedActor.themeFontFamily || 'inherit',
                                fontSize: '1.2rem',
                                fontWeight: 'bold',
                            }}
                        >
                            {typedActor.name}
                        </Box>
                        <Box
                            sx={{
                                color: '#ffffff',
                                fontSize: '0.9rem',
                                lineHeight: 1.4,
                            }}
                        >
                            {typedActor.profile}
                        </Box>
                    </Box>
                );
            }}
        /> : <></>}
    </div>
    );
}