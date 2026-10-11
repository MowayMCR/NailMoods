import SavePoseAction from './SavePoseAction';
import React from 'react';
import {Check,RotateCcw,Send,ArrowRight} from 'lucide-react';
export default function ResultActions({saved=false,onSave,onSaveProject,onDone,onVariant,onShare,onOpen}) {
 return <section className="resultActions" aria-label="Actions de l’idée"><div><SavePoseAction onSaveIdea={onSave} onSaveProject={onSaveProject} saved={saved}/>{onDone&&<button className="detailSecondary" onClick={onDone}><Check/>Je l’ai faite</button>}{onVariant&&<button className="nmQuiet" onClick={onVariant}><RotateCcw/>Créer une variante</button>}{onShare&&<button className="nmQuiet" onClick={onShare}><Send/>Envoyer à ma PO</button>}{onOpen&&<button className="nmQuiet" onClick={onOpen}>Voir la fiche et la recette<ArrowRight/></button>}</div></section>;
}
