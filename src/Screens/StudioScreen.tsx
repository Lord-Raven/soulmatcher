import { Stage, GamePhase } from "../Stage";
import { Skit, SkitType, buildScriptLog, generateSkitScript } from "../Skit";
import { FC, useEffect, useRef, useState } from "react";
import { ScreenType } from "./BaseScreen";
import { Actor, findBestNameMatch, removeBackgroundFromEmotionImage } from "../Actor";
import { NovelVisualizer } from "@lord-raven/novel-visualizer";
import { Emotion } from "../Emotion";
import { Box, CircularProgress, Typography } from "@mui/material";
import { LastPage, PlayArrow, Send } from "@mui/icons-material";
import { CandidateSelectionUI } from "./CandidateSelectionUI";
import { useCallback } from "react";
import { NamePlate } from "./UIComponents";
import { useTooltip } from "./TooltipContext";
import { Curtain } from "./Curtain";

interface StudioScreenProps {
    stage: () => Stage;
    setScreenType: (type: ScreenType) => void;
    isVerticalLayout: boolean;
    curtainPosition: 'up' | 'down';
}

// This screen represents the main game screen in a gameshow studio setting. The player will make some basic choices that lead to different skits and direct the flow of the game.
export const StudioScreen: FC<StudioScreenProps> = ({ stage, setScreenType, isVerticalLayout, curtainPosition }) => {
    const [showSelectionUI, setShowSelectionUI] = useState(false);
    const [isGeneratingNextSkit, setIsGeneratingNextSkit] = useState(false);
    const [finalVoteResult, setFinalVoteResult] = useState<{
        hostChoiceId: string;
        audienceChoiceId: string;
        rawResponse: string;
    } | null>(null);
    const [isAwaitingFinalVotes, setIsAwaitingFinalVotes] = useState(false);
    const finalVotePromiseRef = useRef<Promise<{
        hostChoiceId: string;
        audienceChoiceId: string;
        rawResponse: string;
    }> | null>(null);
    const { setTooltip, clearTooltip } = useTooltip();

    const currentPhase = stage().getCurrentPhase();
    
    // This is a physical description of the studio space for SoulMatcher, a dating gameshow on which the player is a contestant.
    const studioDescription = "The studio is a vibrant and dynamic space, designed to evoke the excitement and glamour of a high-stakes dating gameshow. The stage is set with bright, colorful lights that create an energetic atmosphere, while large LED screens display dynamic backgrounds that change with each skit. The audience area is filled with enthusiastic spectators, their cheers and reactions adding to the lively ambiance. The contestant's podium is sleek and modern, equipped with interactive elements that allow the player to make choices that influence the flow of the game. Overall, the studio is a visually stimulating environment that immerses the player in the thrilling world of SoulMatcher.";

    // Handle ESC key to open menu
    const handleEscapeKey = useCallback((e: KeyboardEvent) => {
        if (e.key === 'Escape') {
            e.preventDefault();
            setScreenType(ScreenType.MENU);
        }
    }, [setScreenType]);

    useEffect(() => {
        window.addEventListener('keydown', handleEscapeKey);
        return () => window.removeEventListener('keydown', handleEscapeKey);
    }, [handleEscapeKey]);

    // Determine the phase that should be active for the next skit.
    const determineNextPhase = (currentPhase: GamePhase): GamePhase => {
        switch (currentPhase) {
            case GamePhase.GAME_INTRO:
                return GamePhase.CONTESTANT_INTRO;

            case GamePhase.CONTESTANT_INTRO:
                return stage().allContestantsIntroduced()
                    ? GamePhase.GROUP_INTERVIEW
                    : GamePhase.CONTESTANT_INTRO;

            case GamePhase.GROUP_INTERVIEW:
                return GamePhase.FINALIST_SELECTION;

            case GamePhase.LOSER_INTERVIEW:
                return stage().allLosersInterviewed()
                    ? GamePhase.FINALIST_ONE_ON_ONE
                    : GamePhase.LOSER_INTERVIEW;

            case GamePhase.FINALIST_ONE_ON_ONE:
                return stage().allFinalistsInterviewed()
                    ? GamePhase.FINAL_VOTING
                    : GamePhase.FINALIST_ONE_ON_ONE;

            case GamePhase.FINAL_VOTING:
                return GamePhase.GAME_COMPLETE;

            case GamePhase.GAME_COMPLETE:
                return GamePhase.EPILOGUE;

            case GamePhase.EPILOGUE:
                return GamePhase.EPILOGUE;

            default:
                return currentPhase;
        }
    };

    // Generate a skit for the current game phase (phase must already be set).
    const generateNextSkit = (phaseOverride?: GamePhase): Skit => {
        const currentPhase = phaseOverride ?? stage().getCurrentPhase();
        const hostActor = stage().getHostActor();
        
        switch (currentPhase) {
            case GamePhase.GAME_INTRO:
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

                    return new Skit({
                        skitType: SkitType.CONTESTANT_INTRO,
                        script: [],
                        presentActors: [nextContestant.id],
                        locationDescription: studioDescription,
                        locationImageUrl: ''
                    });
                }
                return new Skit({
                    skitType: SkitType.CONTESTANT_INTRO,
                    script: [],
                    presentActors: [hostActor.id],
                    locationDescription: studioDescription,
                    locationImageUrl: ''
                });

            case GamePhase.GROUP_INTERVIEW:
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

            case GamePhase.LOSER_INTERVIEW:
                const nextLoserPair = stage().getNextLoserPair();
                if (nextLoserPair && nextLoserPair.length > 0) {
                    stage().markLosersInterviewed(nextLoserPair.map(a => a.id));

                    return new Skit({
                        skitType: SkitType.LOSER_INTERVIEW,
                        script: [],
                        presentActors: nextLoserPair.map(a => a.id),
                        locationDescription: studioDescription,
                        locationImageUrl: ''
                    });
                }
                return new Skit({
                    skitType: SkitType.LOSER_INTERVIEW,
                    script: [],
                    presentActors: [hostActor.id],
                    locationDescription: studioDescription,
                    locationImageUrl: ''
                });

            case GamePhase.FINALIST_ONE_ON_ONE:
                const nextFinalist = stage().getNextFinalistToInterview();
                if (nextFinalist) {
                    stage().markFinalistInterviewed(nextFinalist.id);

                    return new Skit({
                        skitType: SkitType.FINALIST_ONE_ON_ONE,
                        script: [],
                        presentActors: [nextFinalist.id],
                        locationDescription: "A cozy, intimate setting with soft lighting and comfortable seating, perfect for getting to know someone better.",
                        locationImageUrl: ''
                    });
                }
                return new Skit({
                    skitType: SkitType.FINALIST_ONE_ON_ONE,
                    script: [],
                    presentActors: [hostActor.id],
                    locationDescription: "A cozy, intimate setting with soft lighting and comfortable seating, perfect for getting to know someone better.",
                    locationImageUrl: ''
                });

            case GamePhase.FINAL_VOTING:
                // Selection UI handles this phase; keep a minimal placeholder skit as a fallback.
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

            case GamePhase.EPILOGUE:
                const winnerId = stage().saveData.gameProgress.winnerId;
                const winner = winnerId ? stage().saveData.actors[winnerId] : null;
                return new Skit({
                    skitType: SkitType.EPILOGUE,
                    script: [],
                    presentActors: winner ? [winner.id] : [],
                    locationDescription: "An intimate, comfortable space where the couple shares their life together. The setting reflects their relationship and the passage of time since the gameshow.",
                    locationImageUrl: ''
                });

            default:
                return new Skit({
                    skitType: SkitType.GAME_INTRO,
                    script: [],
                    presentActors: [hostActor.id],
                    locationDescription: studioDescription,
                    locationImageUrl: ''
                });
        }
    };


    const buildFinalVotePrompt = (candidates: Actor[]): string => {
        const player = stage().getPlayerActor();
        const host = stage().getHostActor();
        const candidateList = candidates.map(candidate => {
            return `- ${candidate.name}: ${candidate.profile}`;
        }).join('\n');
        const finalistOneOnOneScripts = candidates.map(candidate => {
            const matchingSkits = stage().getSkitsInOrder().filter(skit =>
                skit.skitType === SkitType.FINALIST_ONE_ON_ONE &&
                skit.presentActors?.includes(candidate.id)
            );
            const latestSkit = matchingSkits[matchingSkits.length - 1];
            const scriptLog = latestSkit ? buildScriptLog(stage(), latestSkit) : '(No one-on-one skit found)';
            return `\n${candidate.name} One-on-One:\n${scriptLog}`;
        }).join('\n\n');

        return `{{messages}}You are preparing structured, parseable voting results for the final match decision in a dating gameshow visual novel.` +
            `\n\nContext:` +
            `\nPlayer: ${player.name}` +
            `\nCupid (Host): ${host.name}` +
            `\nFinalist One-on-One Scripts:${finalistOneOnOneScripts}` +
            `\n\nFinalist Candidates:` +
            `\n${candidateList}` +
            `\n\nTask:` +
            `\nDecide who Cupid votes for and who the audience votes for. Bear in mind that Cupid's vote is often capricious or entertaining while the audience's vote generally reflects popular opinion. Each vote must be one of the finalist candidate names listed above.` +
            `\n\nResponse Format (strict):` +
            `\nCUPID_VOTE: <candidate name>` +
            `\nAUDIENCE_VOTE: <candidate name>` +
            `\n#END#`;
    };

    const parseFinalVoteResponse = (responseText: string, candidates: Actor[]) => {
        const lines = responseText
            .split('\n')
            .map(line => line.replace(/\*\*/g, '').trim())
            .filter(Boolean);

        let cupidVoteText = '';
        let audienceVoteText = '';

        for (const line of lines) {
            const normalized = line.toUpperCase();
            if (normalized.startsWith('CUPID_VOTE')) {
                cupidVoteText = line.split(':').slice(1).join(':').trim();
            } else if (normalized.startsWith('AUDIENCE_VOTE')) {
                audienceVoteText = line.split(':').slice(1).join(':').trim();
            }
        }

        const resolveCandidateId = (voteText: string): string => {
            const cleanedVote = voteText.replace(/["']/g, '').trim();
            const exactMatch = candidates.find(candidate => candidate.name.toLowerCase() === cleanedVote.toLowerCase());
            const bestMatch = findBestNameMatch(cleanedVote, candidates);
            if (exactMatch || bestMatch) {
                return (exactMatch || bestMatch)?.id || '';
            }

            if (candidates.length === 0) {
                return '';
            }

            const randomIndex = Math.floor(Math.random() * candidates.length);
            return candidates[randomIndex]?.id || candidates[0].id;
        };

        return {
            hostChoiceId: resolveCandidateId(cupidVoteText),
            audienceChoiceId: resolveCandidateId(audienceVoteText),
        };
    };

    const getOrStartFinalVoteAssessment = (): Promise<{
        hostChoiceId: string;
        audienceChoiceId: string;
        rawResponse: string;
    }> => {
        if (finalVotePromiseRef.current) {
            return finalVotePromiseRef.current;
        }

        const candidates = stage().saveData.gameProgress.finalistIds
            .map(id => stage().saveData.actors[id])
            .filter(actor => actor) as Actor[];

        const prompt = buildFinalVotePrompt(candidates);
        const promise = (async () => {
            const response = await stage().generator.textGen({
                prompt,
                min_tokens: 5,
                max_tokens: 80,
                include_history: true,
                stop: ['#END']
            });
            const responseText = response?.result || '';
            const parsedVotes = parseFinalVoteResponse(responseText, candidates);
            return {
                ...parsedVotes,
                rawResponse: responseText,
            };
        })();

        finalVotePromiseRef.current = promise;

        promise
            .then(result => {
                setFinalVoteResult(result);
            })
            .catch(error => {
                console.error('Error generating final votes:', error);
            });

        return promise;
    };

    useEffect(() => {
        if (showSelectionUI && currentPhase === GamePhase.FINAL_VOTING) {
            if (!finalVotePromiseRef.current && !finalVoteResult) {
                getOrStartFinalVoteAssessment();
            }
        } else if (currentPhase !== GamePhase.FINAL_VOTING) {
            finalVotePromiseRef.current = null;
            setFinalVoteResult(null);
            setIsAwaitingFinalVotes(false);
        }
    }, [currentPhase, finalVoteResult, showSelectionUI]);

    // Handler for when the submit button is pressed in NovelVisualizer. At this point, if the user had input, it has been spliced into the script.
    const handleSubmit = async (input: string, skit: any, index: number) => {
        if (input.trim() === '' && index < (skit as Skit).script.length - 1) {
            console.log('No input and more skit to display; no action needed.');
            return skit;
        } else if (input.trim() === '' && (skit as Skit).script[index].endScene) {
            console.log('No input and skit complete; proceed to next phase or whatever.');
            const currentPhase = stage().getCurrentPhase();
            const nextPhase = determineNextPhase(currentPhase);

            // Phases that need external UI for player input
            const needsPlayerInput = [
                GamePhase.FINALIST_SELECTION,
                GamePhase.FINAL_VOTING
            ];

            if (needsPlayerInput.includes(nextPhase)) {
                if (nextPhase !== currentPhase) {
                    stage().advancePhase(nextPhase);
                }
                // Show selection UI instead of generating new skit
                console.log(`Phase ${nextPhase} requires player input - showing selection UI`);
                setShowSelectionUI(true);
                return skit; // Reconsider this.
            }

            if (nextPhase !== currentPhase) {
                stage().advancePhase(nextPhase);
            }

            // Generate the next skit and generate its initial script before returning
            const nextSkit = generateNextSkit(nextPhase);
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
            // Replace the stage skit with the updated skit:
            stage().saveData.skits[skit.id] = {...stage().saveData.skits[skit.id], script: (skit as Skit).script};
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
            // Save the finalists and advance to loser interviews
            stage().setFinalists(selectedIds);
            stage().advancePhase(GamePhase.LOSER_INTERVIEW);
            setShowSelectionUI(false);
            setIsGeneratingNextSkit(true);
            
            try {
                // Generate the first loser interview skit
                const nextSkit = generateNextSkit();
                const scriptResult = await generateSkitScript(nextSkit, stage());
                nextSkit.script.push(...scriptResult.entries);
                stage().addSkit(nextSkit);
                stage().saveGame();
                console.log('Generated first loser interview skit');
            } finally {
                setIsGeneratingNextSkit(false);
            }
        } else if (currentPhase === GamePhase.FINAL_VOTING) {
            // Save the player's final choice
            stage().setPlayerChoice(selectedIds[0]);
            setIsAwaitingFinalVotes(true);
            setShowSelectionUI(false);
            setIsGeneratingNextSkit(true);

            try {
                const voteResult = finalVoteResult || await getOrStartFinalVoteAssessment();
                if (voteResult?.hostChoiceId) {
                    stage().setHostChoice(voteResult.hostChoiceId);
                }
                if (voteResult?.audienceChoiceId) {
                    stage().setAudienceChoice(voteResult.audienceChoiceId);
                }
                const finalists = stage().saveData.gameProgress.finalistIds;
                const voteCounts: Record<string, number> = {};
                finalists.forEach(id => {
                    voteCounts[id] = 0;
                });
                [selectedIds[0], voteResult?.hostChoiceId, voteResult?.audienceChoiceId].forEach(voteId => {
                    if (voteId && voteCounts[voteId] !== undefined) {
                        voteCounts[voteId] += 1;
                    }
                });
                const sortedVotes = Object.entries(voteCounts).sort((a, b) => b[1] - a[1]);
                const topScore = sortedVotes[0]?.[1] ?? 0;
                const tied = sortedVotes.filter(([_, count]) => count === topScore).map(([id]) => id);
                const winnerId = tied.includes(selectedIds[0]) ? selectedIds[0] : tied[0];
                if (winnerId) {
                    stage().setWinner(winnerId);
                }
                
                // Advance to GAME_COMPLETE and generate results skit
                stage().advancePhase(GamePhase.GAME_COMPLETE);
                const resultsSkit = generateNextSkit();
                const scriptResult = await generateSkitScript(resultsSkit, stage());
                resultsSkit.script.push(...scriptResult.entries);
                stage().addSkit(resultsSkit);
                stage().saveGame();
                console.log('Generated results skit after final voting');
            } finally {
                setIsAwaitingFinalVotes(false);
                setIsGeneratingNextSkit(false);
            }
            return;
        }
    };
    
    let skit = stage().getCurrentSkit();

    const getSkitTitle = (currentSkit: Skit | null): string | null => {
        if (!currentSkit) {
            return null;
        }

        switch (currentSkit.skitType) {
            case SkitType.GAME_INTRO:
                return "Introduction";
            case SkitType.CONTESTANT_INTRO:
                return "Meet the Contestants";
            case SkitType.GROUP_INTERVIEW:
                return "Group Interview";
            case SkitType.LOSER_INTERVIEW:
                return "Exit Interviews";
            case SkitType.FINALIST_ONE_ON_ONE:
                return "One-on-One Time";
            case SkitType.RESULTS:
                return "The Reveal";
            case SkitType.EPILOGUE:
                return "Ever After";
            default:
                return null;
        }
    };

    const bannerTitle = getSkitTitle(skit);

    // Show selection UI for finalist selection and final voting phases
    if (showSelectionUI) {
        const candidates = currentPhase === GamePhase.FINALIST_SELECTION 
            ? stage().getContestantActors()
            : stage().saveData.gameProgress.finalistIds.map(id => stage().saveData.actors[id]).filter(actor => actor) as Actor[];
        
        const maxSelections = currentPhase === GamePhase.FINALIST_SELECTION ? 3 : 1;
        
        const scenarioTitle = currentPhase === GamePhase.FINALIST_SELECTION 
            ? "Finalist Selection"
            : "Final Decision";
        
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
                isProcessing={currentPhase === GamePhase.FINAL_VOTING && isAwaitingFinalVotes}
                processingLabel="Cupid and the audience are casting their votes..."
            />
        );
    }

    // Show loading spinner while generating the next skit
    if (isGeneratingNextSkit) {
        return (
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    minHeight: '100vh',
                    backgroundColor: 'rgba(0, 0, 0, 0.85)',
                    flexDirection: 'column',
                    gap: 2,
                }}
            >
                <CircularProgress size={60} sx={{ color: '#FFD700' }} />
                <Typography
                    variant="h6"
                    sx={{
                        color: '#FFD700',
                        textAlign: 'center',
                        fontSize: '1.1rem',
                    }}
                >
                    Preparing the next round...
                </Typography>
            </Box>
        );
    }

    return (
        <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
            {/* Title Ribbon */}
            <Box
                sx={{
                    position: 'absolute',
                    top: 16,
                    left: 16,
                    zIndex: 1000,
                    backgroundColor: 'rgba(0, 0, 0, 0.75)',
                    backdropFilter: 'blur(4px)',
                    padding: '8px 24px',
                    borderRadius: '20px',
                    border: '2px solid #FFD700',
                    boxShadow: '0 4px 12px rgba(255, 215, 0, 0.3)',
                }}
            >
                <Typography
                    variant="h6"
                    sx={{
                        color: '#FFD700',
                        fontWeight: 'bold',
                        fontSize: '1.1rem',
                        letterSpacing: '0.5px',
                        textTransform: 'uppercase',
                        textShadow: '0 2px 4px rgba(0, 0, 0, 0.5)',
                    }}
                >
                    {bannerTitle}
                </Typography>
            </Box>
            
            {(skit && skit.script) ? <NovelVisualizer
            script={skit}
            renderNameplate={(actor: any) => {
                if (!actor || !actor.name) return null;
                const typedActor = actor as Actor;
                return (
                    <NamePlate
                        actor={typedActor}
                    />
                );
            }}
            getBackgroundImageUrl={(script, index: number) => {return (script as Skit).locationImageUrl || ''}}
            backgroundElements={<Curtain position={curtainPosition} zIndex={10} />}
            setTooltip={setTooltip}
            isVerticalLayout={isVerticalLayout}
            actors={stage().saveData.actors}
            playerActorId={stage().getPlayerActor().id}
            getPresentActors={(script, index: number) => (script as Skit).presentActors?.map(actorId => stage().saveData.actors[actorId]).filter(actor => actor) || []}
            getActorImageUrl={(actor, script, index: number) => {
                const emotion = determineEmotion(actor.id, script as Skit, index);
                // If this actor is flagged for background removal and the emotion image URL has "avatars" in it, it's part of an official pack that was determined to be non-transparent; use neutral for now.
                if (actor.flagForBackgroundRemoval && actor.emotionPack[emotion].includes('avatars')) {
                    return actor.emotionPack[Emotion.neutral] || '';
                }
                return actor.emotionPack[emotion] || actor.emotionPack[Emotion.neutral] || '';
            }}
            onSubmitInput={handleSubmit}
            getSubmitButtonConfig={(script, index, inputText) => {
                const endScene = index >= 0 ? ((script as Skit).script[index]?.endScene || false) : false;
                return {
                    label: (inputText.trim().length > 0 ? 'Send' : (endScene ? 'Next Round' : 'Continue')),
                    enabled: true,
                    colorScheme: (inputText.trim().length > 0 ? 'primary' : (endScene ? 'error' : 'primary')),
                    icon: (inputText.trim().length > 0 ? <Send/> : (endScene ? <LastPage/> : <PlayArrow/>))
                }
            }}
            enableAudio={!stage().saveData.disableTextToSpeech}
            enableGhostSpeakers={true}
            enableTalkingAnimation={true}
            renderActorHoverInfo={(actor) => {
                if (!actor || actor.id === stage().getPlayerActor().id) return null;
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
                        <Box sx={{ marginBottom: 1 }}>
                            <NamePlate
                                actor={typedActor}
                            />
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
        </Box>
    );
}