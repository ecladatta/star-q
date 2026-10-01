UPDATE corpus
SET settings = (settings - 'wikidataConstraintWarnings' - 'wikidataPredicateFiltering')
  || CASE WHEN settings ? 'wikidataConstraintWarnings' THEN jsonb_build_object('wikibaseConstraintWarnings', settings->'wikidataConstraintWarnings') ELSE '{}'::jsonb END
  || CASE WHEN settings ? 'wikidataPredicateFiltering' THEN jsonb_build_object('wikibasePredicateFiltering', settings->'wikidataPredicateFiltering') ELSE '{}'::jsonb END
WHERE settings ? 'wikidataConstraintWarnings' OR settings ? 'wikidataPredicateFiltering';
