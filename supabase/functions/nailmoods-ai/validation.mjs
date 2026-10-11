// Classification is diagnostic; authorization, moderation and reserved budgets are never relaxed.
const warning=new Set(['incoherent_palette','requested_palette_missing','repeated_designs','unrelated_motif','missing_technique','missing_essential_motif','difficulty_mismatch','invalid_motif_technique']);
const repairable=new Set(['invalid_json','invalid_plan','invalid_direction','invalid_art','invalid_motif','invalid_motif_colors','source_match','invalid_card','invalid_targeted_edit']);
export function validationCategory(code){
 if(warning.has(code))return 'warning';
 if(repairable.has(code))return 'repairable';
 if(/quota|budget|credits|rate_limit|limit_reached/.test(code))return 'quota_error';
 if(/provider|incomplete_response|moderation_unavailable/.test(code))return 'provider_error';
 return 'fatal';
}
