import { Stage } from "../Stage";
import { Skit, SkitType } from "../Skit";
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
    let skit = stage().getCurrentSkit() || {} as Skit;

    // If no skit; it's time for an intro:
    if (!skit) {
        skit = {
            skitType: SkitType.INTRO,
            script: [{
                speakerId: stage().getHostActor().id,
                message: "Welcome to SoulMatcher, the ultimate dating gameshow where your choices shape your romantic destiny! Get ready to meet intriguing contestants, navigate unexpected twists, and find out if you have what it takes to win the heart of your perfect match. Let the games begin!",
                speechUrl: '',
                actorEmotions: { [stage().getHostActor().id]: Emotion.joy },
            },
            {
                speakerId: '',
                message: "As you step onto the stage, the dazzling lights and roaring audience fill you with a mix of excitement and nerves. The host's charismatic voice welcomes you to the show, setting the tone for an unforgettable experience. You glance around, taking in the vibrant atmosphere of the studio, and prepare yourself for the thrilling journey ahead on SoulMatcher!",
                speechUrl: '',
                actorEmotions: { [stage().getHostActor().id]: Emotion.pride },
            }],
            presentActors: [stage().getHostActor().id, ...stage().getContestantActors().map(actor => actor.id)],
            locationDescription: studioDescription,
            locationImageUrl: 'https://via.placeholder.com/640x480/4a90e2/666666?text=Studio',
        }
    }



    return (<div>
        {(skit && skit.script) ? <NovelVisualizer
            script={skit}
            backgroundImageUrl={skit.locationImageUrl || ''}
            isVerticalLayout={isVerticalLayout}
            actors={stage().saveData.actors}
            getPresentActors={(skit: Skit, index: number) => skit.presentActors?.map(actorId => stage().saveData.actors[actorId]).filter(actor => actor) || []}
            resolveSpeaker={(skit: Skit, index: number) => {console.log('Resolving speaker at index', index); return stage().saveData.actors[skit.script?.[index]?.speakerId || ''] || null;}}
            getActorImageUrl={(actor: Actor, skit: Skit, index: number) => {console.log(`Getting actor image for ${actor.name}.`); return actor.emotionPack['neutral'];}}
        /> : <></>}
    </div>
    );
}