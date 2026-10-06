-- JSON null is not SQL NULL: an absent decoration must not become a gold shape.
do $$declare definition text;begin
 definition:=pg_get_functiondef('private.discovery_preview(jsonb)'::regprocedure);
 definition:=replace(definition,'n->''decoration'' is not null','jsonb_typeof(n->''decoration'')=''object'' and length(coalesce(n->''decoration''->>''motif'',''''))>0');
 execute definition;
end$$;
