# Changelog

## [1.2.0](https://github.com/ecladatta/star-q/compare/v1.1.0...v1.2.0) (2026-09-04)


### Features

* add document actions menu with full-width display toggle ([7eb2103](https://github.com/ecladatta/star-q/commit/7eb21030f0ad5d792c100246cdee10faae93627f))
* add STAR-Q logo to headers and replace favicon ([4ae5fb7](https://github.com/ecladatta/star-q/commit/4ae5fb7da936a45233a767a18637cfc2ad744d05))
* move document actions into compact sticky header with metadata row ([06eb3d8](https://github.com/ecladatta/star-q/commit/06eb3d801d929330bd949323915b6c083d85abdf))
* show annotations sidebar with empty state instead of hiding it ([53246f5](https://github.com/ecladatta/star-q/commit/53246f5a2c2a750a3da8fa289dc517dd18439a0b))
* slide annotation form in and out of view ([d73d646](https://github.com/ecladatta/star-q/commit/d73d6464005a0e41e4d540a5dac23b83d01696a8))


### Bug Fixes

* add scroll edge fades to mobile tab navigation ([3946466](https://github.com/ecladatta/star-q/commit/394646618a1283f43d0dfdd014c02d7266fd1bd7))
* adopt official shadcn primitives so popover animations match Radix state attributes ([b815f5c](https://github.com/ecladatta/star-q/commit/b815f5c740c6c854bae2d9c8c9edef03b0ad129b))
* anchor sr-only labels inside buttons to prevent page-level horizontal overflow ([ff06b6b](https://github.com/ecladatta/star-q/commit/ff06b6b01436af8ba244e360c80a466fa3d45eba))
* enlarge documents table checkbox touch targets to 44px ([ec778f8](https://github.com/ecladatta/star-q/commit/ec778f8a711aba91412fad8f6314104d96db3343))
* flush annotation form to viewport bottom on mobile ([b908bf0](https://github.com/ecladatta/star-q/commit/b908bf0104f6ee1b83ad205d2af97e4cbe762f2d))
* keep auth redirects on the serving origin ([fa45c3b](https://github.com/ecladatta/star-q/commit/fa45c3b00e8eb9e029c2af03b5ae2c7f0e8aa3c6))
* make annotations panel reachable on mobile via a slide-over sheet ([1e9eee7](https://github.com/ecladatta/star-q/commit/1e9eee7f27a635ee28dace749f4487a30305eb05))
* prevent iOS zoom on native role selects ([74ffae0](https://github.com/ecladatta/star-q/commit/74ffae0b218cc24bb3a69717f59b5947b478c48b))
* render corpus danger zone only in the General settings tab ([192566d](https://github.com/ecladatta/star-q/commit/192566daea118dab3ef90f59fa074309eaa692a1))
* reuse Table scroll container on hand-rolled admin tables ([a45a128](https://github.com/ecladatta/star-q/commit/a45a1286300e1cd057abf1f4bc794e04de5b17dd))
* soften wikidata degradation logs on upstream unavailability ([19c8dde](https://github.com/ecladatta/star-q/commit/19c8dde33da972cc169699d11badfaba9a2e7008))
* stack PageHeader actions below the title on small screens ([11411ea](https://github.com/ecladatta/star-q/commit/11411ead4fdbe73f0637be033f27ffcdb0d8eeda))
* stack table pagination footer on small screens ([67e6463](https://github.com/ecladatta/star-q/commit/67e6463784e196468b393c34a2762d44b0399193))
* wrap destructive admin action label on small screens ([06047ac](https://github.com/ecladatta/star-q/commit/06047ac8d8b59e54934c0d7522e06b4290e2b356))

## [1.1.0](https://github.com/ecladatta/star-q/compare/v1.0.0...v1.1.0) (2026-09-04)


### Features

* add corpus ownership transfer table and locking helpers ([00ae8e1](https://github.com/ecladatta/star-q/commit/00ae8e197065eacf780cb92c3eeb9f87471c7703))
* add corpus ownership transfers ([fb9faaa](https://github.com/ecladatta/star-q/commit/fb9faaa44b1ec68f2395162453c184be6c8b102a))
* add personal team lifecycle with lazy provisioning ([bb7173c](https://github.com/ecladatta/star-q/commit/bb7173c67838ab70fcd86eba6a45791a0779571f))
* add quick actions menu to admin corpora table ([1e29e12](https://github.com/ecladatta/star-q/commit/1e29e1242290898b9194a59c33a6ea79fb34d547))
* add quick actions menu to admin teams table ([c52c0a9](https://github.com/ecladatta/star-q/commit/c52c0a9f4e15a32d619be29d2e771fc4563f3d34))
* add quick actions menu to admin users table ([ed44df0](https://github.com/ecladatta/star-q/commit/ed44df007b12312dd25ae8e6c5b8a0e83e242d79))
* add success toasts for corpus rename and team invitations ([08b9b00](https://github.com/ecladatta/star-q/commit/08b9b00e6702e17f92033cdc78f44a5c760f0532))
* add team.kind column as ownership-collapse foundation ([cab0049](https://github.com/ecladatta/star-q/commit/cab0049dc0443e1482535307a57b97b5aa74a376))
* add type-to-confirm deletion for corpora and teams ([fd62f6e](https://github.com/ecladatta/star-q/commit/fd62f6e74fee6d2b33b8623ff9fffad96e929cae))
* collapse corpus ownership to teams-only with data migration ([bb8d359](https://github.com/ecladatta/star-q/commit/bb8d359efc7f148a63f42cdc3aa7e252f1df8663))
* let admins directly manage corpus access ([5427eef](https://github.com/ecladatta/star-q/commit/5427eef94a21c5d9079ab83f7826f0b0a983d3c3))
* move corpus ownership transfer to settings danger zone ([9aead7f](https://github.com/ecladatta/star-q/commit/9aead7fd31fe2cecd2bd334fb503b9c217c2d56f))
* replace ownership transfer with immediate move to team ([421a71d](https://github.com/ecladatta/star-q/commit/421a71d1b5600d25e7c64169365ac3260ed30ab7))
* require acceptance for corpus ownership transfers ([0925856](https://github.com/ecladatta/star-q/commit/0925856c968995d9f8901f3ebbc2f5d16b427034))
* show deletion impact summary in the delete-user dialogs ([fba8fb5](https://github.com/ecladatta/star-q/commit/fba8fb58a7511478dbfdef53c871a904a3ec6221))
* use dropdown for corpus collaborator roles ([4c19862](https://github.com/ecladatta/star-q/commit/4c198625dd56e97f35bb9be15c82aa30e7f9fbed))


### Bug Fixes

* add top margin to the analytics wikidata warnings section ([9c0ec1e](https://github.com/ecladatta/star-q/commit/9c0ec1e82439a2868689ea0554206c51c73e060d))
* close command palette after applying a theme ([9e3a602](https://github.com/ecladatta/star-q/commit/9e3a6023f8be797c7203422a1885718ffcbe8817))
* guard admin mutations against concurrent changes ([469d4e0](https://github.com/ecladatta/star-q/commit/469d4e0aa7c9d52f70c05569ef3def4812c9169b))
* harden team mutations with row locks ([3855dd8](https://github.com/ecladatta/star-q/commit/3855dd8c4ad6d31426389f91a805b54c83a276ec))
* hide member controls on personal team pages ([db3d1b4](https://github.com/ecladatta/star-q/commit/db3d1b4c805dceeb7c83f716310b2f9a8ae9076c))
* make corpus collaboration mutations transactional ([f2d6470](https://github.com/ecladatta/star-q/commit/f2d6470be6a2eefd0b4118296cdaeca944efae45))
* name personal teams without the (personal) suffix ([cdbfb9d](https://github.com/ecladatta/star-q/commit/cdbfb9df71ae1de991585d09df1b4228ea5611b2))
* only shared-team sole ownership prevents blocking a user ([267080c](https://github.com/ecladatta/star-q/commit/267080c4beaa5e4fe5d7c5224f80544db882ef12))
* render Forbidden page instead of 500 or silent redirect for corpus management URLs ([aa8b3a4](https://github.com/ecladatta/star-q/commit/aa8b3a4c5c32fc2a54e619a026e002b28249c1ab))

## [1.0.0](https://github.com/ecladatta/star-q/compare/v0.3.0...v1.0.0) (2026-08-31)


### ⚠ BREAKING CHANGES

* The Docker Compose project was renamed to `star-q`, which changes the name of the Docker volume. To avoid data loss during the upgrade, migrate the data from the existing `annotation-tool_postgres-data` volume to the new `star-q_postgres-data` volume.

  Recommended upgrade steps:

  1. Stop the containers:

  ```bash
  docker compose -f compose.prod.yaml down
  ```

  2. Copy the data from the old volume to the new volume:

  ```bash
  docker run --rm \
    -v annotation-tool_postgres-data:/from \
    -v star-q_postgres-data:/to \
    alpine sh -c 'cd /from && cp -a . /to'
  ```

  3. Restart the containers:

  ```bash
  docker compose -f compose.prod.yaml up -d --build
  ```

* Authentication is now mandatory. The `AUTH_ENABLED` option and anonymous mode are removed, and an initial administrator must be created at `/setup` after migrating the database
* The static API key mechanism was removed. Both `API_KEY` and the `x-api-key` header no longer grant access. Create API keys in the admin interface instead
* Removed environment variables `AUTH_ENABLED`, `AUTH_DRIZZLE_URL`, `ALLOWED_EMAILS`, `ALLOWED_WIKIMEDIA_IDS`, and `API_KEY`, and added `APP_NAME`, `RDF_NAMESPACE_BASE`, and `LOCAL_CREDENTIALS_ENABLED`
* Corpus access is now per-corpus. Authenticated users no longer implicitly read and edit every corpus, and existing corpora are migrated without an owner until ownership is assigned via the admin dashboard


### Features

* add authorization, roles, teams, and corpus access control ([#14](https://github.com/ecladatta/star-q/issues/14)) ([53cada9](https://github.com/ecladatta/star-q/commit/53cada92d6c7fb9cf88ea2e0cfee3f4199691af9))
* add text, CSV/TSV, and ZIP formats and replace import auto-detection with explicit format selection ([#15](https://github.com/ecladatta/star-q/issues/15)) ([01dc79a](https://github.com/ecladatta/star-q/commit/01dc79a2be4c3f82f30b892861825c592cf87d65))
* make RDF namespace base URI configurable ([3e9c837](https://github.com/ecladatta/star-q/commit/3e9c837c05aa735eafa15a4b0dc3d0dd8cca68de))
* redesign app shell with route groups and persistent navigation ([#16](https://github.com/ecladatta/star-q/issues/16)) ([2b7e54d](https://github.com/ecladatta/star-q/commit/2b7e54da536e54367e06ccb98235faca8f843b3a))
* rename ECLADATTA Annotation Tool to STAR-Q with configurable APP_NAME ([1fac3eb](https://github.com/ecladatta/star-q/commit/1fac3eb3e78c5802b6de39655bc0253b57f2668c))


### Bug Fixes

* log Wikidata constraint check failures to identify root cause ([5a0e22d](https://github.com/ecladatta/star-q/commit/5a0e22d90d957838325fa476a2779645f00d9e98))


### Miscellaneous Chores

* release 1.0.0 ([71eac95](https://github.com/ecladatta/star-q/commit/71eac9520764e5c4b5e25ba2b0bc003659ed6b80))

## [0.3.0](https://github.com/ecladatta/star-q/compare/v0.2.0...v0.3.0) (2026-08-25)

### Features

* add corpus visibility and read-only annotation inspection ([c3d9b11](https://github.com/ecladatta/star-q/commit/c3d9b115bf3139bbb8ba9ca3b1c05dad3ce44b50))
* add Wikidata constraint warnings, predicate filtering, and qualifier range checks ([#10](https://github.com/ecladatta/star-q/issues/10)) ([ecd44c4](https://github.com/ecladatta/star-q/commit/ecd44c4baca21e19acb8b4ed51a5ff384a8c3b33))

### Bug Fixes

* **changelog:** correct v0.2.0 compare link ([fc3995f](https://github.com/ecladatta/star-q/commit/fc3995f2965fa6dd5570d3728510dc3ba1b32b41))

## [0.2.0](https://github.com/ecladatta/star-q/compare/v0.1.0...v0.2.0) (2026-08-19)

### Features

* add QuickStatements 3.0 corpus export ([#9](https://github.com/ecladatta/star-q/issues/9)) ([c08b6c7](https://github.com/ecladatta/star-q/commit/c08b6c7030f114517a0180c9adc99ea60136f98c))

## [0.1.0](https://github.com/ecladatta/star-q/compare/93587a46ab1ce15c5cb9733bb6cf0a48c3c6d0f1...v0.1.0) (2026-08-14)

### Features

* add annotation count column to the annotation tool table ([4c555ba](https://github.com/ecladatta/star-q/commit/4c555ba0b955aa0c8184bcd335693a110fae4f22))
* add annotation type badges and revamp sidebar UI ([e3e2d38](https://github.com/ecladatta/star-q/commit/e3e2d38f0906a4c3f7ddcfa5af9b841e9ae35b04))
* add AnnotationListsPopover for managing overlapping annotations, refactor popover logic ([89606f4](https://github.com/ecladatta/star-q/commit/89606f41971683200aeb8caec64975c1e3fc3afa))
* add annotations sidebar and refactor code ([d75be66](https://github.com/ecladatta/star-q/commit/d75be6686d3c91c3be066166e379f6f5a915a022))
* add authentication ([c8d026f](https://github.com/ecladatta/star-q/commit/c8d026f1632d43ebcf48fb588555a616fa8904eb))
* add BASE_URL environment variable ([73ad4dc](https://github.com/ecladatta/star-q/commit/73ad4dc477f2a731bd4e9407f520acad0e097901))
* add border to annotation form popup when updating an existing annotation ([fd0f5c5](https://github.com/ecladatta/star-q/commit/fd0f5c5b0cb9ac5fce49433e403095021337f9fa))
* add bulk mark completed and delete operations in documents table ([172b91e](https://github.com/ecladatta/star-q/commit/172b91ed62fd5b2bc4a9a703ccf689123a90d5fb))
* add completion score UI ([b971fb6](https://github.com/ecladatta/star-q/commit/b971fb67507d8b84546c9da26d6f3c140cae713e))
* add copy table and document as Markdown ([b0b8026](https://github.com/ecladatta/star-q/commit/b0b8026ab476835a66f1575739c80d241e00140f))
* add created_at and updated_at columns to annotation table ([4fd894d](https://github.com/ecladatta/star-q/commit/4fd894de588989adc8b33f81f7424c35c3d7e2c8))
* add custom layout files for corpus and document ([bd69bb0](https://github.com/ecladatta/star-q/commit/bd69bb0cfde8a4ab3426bd64e740e04599ddd043))
* add document order to full export/import ([ab20004](https://github.com/ecladatta/star-q/commit/ab200046e88e293904152ebc96837686fecef2ce))
* add entity datatype selection ([4aa793c](https://github.com/ecladatta/star-q/commit/4aa793c066a90aa2fb3b7c7f250136653fb3bcf2))
* add error page ([9092514](https://github.com/ecladatta/star-q/commit/90925142d97664e16f9a090fc5902a6ff27bbb8f))
* add explicit order field and use it for document sequencing ([6145076](https://github.com/ecladatta/star-q/commit/614507655448646b7d6c27feb0ae0c291dc18c54))
* add full corpus export import and export functionality ([72719a7](https://github.com/ecladatta/star-q/commit/72719a7af1f1e853d0b9d3b9055ef3b9f158af76))
* add keyboard shortcuts and info dialog for annotation form and viewer ([5bab843](https://github.com/ecladatta/star-q/commit/5bab843313c3472f9f7c1f3b50407001ee27bcd9))
* add labelstudio import feature ([e3e1863](https://github.com/ecladatta/star-q/commit/e3e1863f93cbf54a6e8d16f1c73759df248f169c))
* add last updated column in documents table ([ea74ae6](https://github.com/ecladatta/star-q/commit/ea74ae62c6ddf846b2db0dd81327c08af2fdeee7))
* add multi-layered colored borders for table annotations ([13b4e67](https://github.com/ecladatta/star-q/commit/13b4e677408460acd2b70c660d0ee3eca84802aa))
* add optimistic navigation and sync filters/sort with URL params ([864c887](https://github.com/ecladatta/star-q/commit/864c88763aa8e40b82715b944afacbf8dd4d76ed))
* add support for IRIT format and reorganize file structure ([59bde93](https://github.com/ecladatta/star-q/commit/59bde933eb92dc7ff48f3bdcda9144fba3db23ee))
* add support for loading html extracted pages from CorpusWalker ([60f562f](https://github.com/ecladatta/star-q/commit/60f562f62ff30eb28f38afa969f0344f76a92c3e))
* add underline to shortcut keys in labels and buttons ([fbe0503](https://github.com/ecladatta/star-q/commit/fbe05030eae74591cb0ba18f9547f7ae130efa0e))
* add user auth checks and better handle auth errors ([51e2a1a](https://github.com/ecladatta/star-q/commit/51e2a1ac7b1007c3c803db766cee6b5641669052))
* **analytics:** add corpus analytics page ([d71a0fe](https://github.com/ecladatta/star-q/commit/d71a0feba281ad2d191250be886de8e2d3b25e21))
* **analytics:** add unassigned predicates and entities reports in UI ([8eb190b](https://github.com/ecladatta/star-q/commit/8eb190bd75fd5e3aa089598fb03515bf991133b1))
* **annotation-form:** add annotation cloning button ([03584f6](https://github.com/ecladatta/star-q/commit/03584f6d7adfb6c959bb5da38bd73a8116df847c))
* **annotation-form:** add scroll-to-element on subject, predicate, object tags ([024283d](https://github.com/ecladatta/star-q/commit/024283d0f77b64d132132c3b8161fae9950d97c3))
* **annotation:** add clone annotation feature with keyboard shortcut (C) ([d87fe03](https://github.com/ecladatta/star-q/commit/d87fe030bc8c9b7638a4b1fddc8e83144e96bac0))
* **annotation:** add Delete key shortcut to trigger delete confirmation popover ([3cdb735](https://github.com/ecladatta/star-q/commit/3cdb735982d68ea702b0b6ba9f5524ed4c7d35b8))
* **annotations-sidebar:** add filtering by type and entity assignment ([6a47fac](https://github.com/ecladatta/star-q/commit/6a47fac1360e466bc8bfec8eb283de018a79d38e))
* **annotations-sidebar:** add sorting options and sort annotations list ([939e19f](https://github.com/ecladatta/star-q/commit/939e19f9d0c619badccbe3539ffeaa21d27b0690))
* **annotations-sidebar:** auto-scroll to current annotation in view ([efd1e8c](https://github.com/ecladatta/star-q/commit/efd1e8cc946cdf668093124d0edc03050925cb37))
* **annotations-sidebar:** highlight current annotation in list ([d37f9db](https://github.com/ecladatta/star-q/commit/d37f9db05984437a3e9c23c39d9cec862c6ee0ab))
* **annotations:** add annotation qualifiers ([#6](https://github.com/ecladatta/star-q/issues/6)) ([f669930](https://github.com/ecladatta/star-q/commit/f669930be303220b1a09ff72556e3a112611964c))
* **annotations:** add batch delete with selection and confirmation dialog ([9cb3bc0](https://github.com/ecladatta/star-q/commit/9cb3bc0ecbf7186a4d7f5eaa34516a7894542321))
* **annotation:** toggle annotation visibility with 'h' key shortcut ([0921546](https://github.com/ecladatta/star-q/commit/0921546a5e41a134f82f0874197f5f5d5effdc4e))
* **api:** add corpus analytics, entities, and get API routes ([2bf3bed](https://github.com/ecladatta/star-q/commit/2bf3bedfea2415a3416bc7989f7a79c5f27719c5))
* **api:** add GET route for corpus API ([eb65d2e](https://github.com/ecladatta/star-q/commit/eb65d2e238cbf78bfe4f33c97e3a655b34337211))
* **auth:** add API key authentication and error handling for API routes ([4a25863](https://github.com/ecladatta/star-q/commit/4a258634aa5c729e9563e7a60ae0b7f5b84691cb))
* **auth:** add email whitelist check on sign-in callback ([aeb50dc](https://github.com/ecladatta/star-q/commit/aeb50dc438c1987445c8c2c7f1f5dbfe0b45654d))
* **auth:** add Wikimedia SSO provider ([#8](https://github.com/ecladatta/star-q/issues/8)) ([7157925](https://github.com/ecladatta/star-q/commit/715792583b6e9135eece10b6cde91b8f1cbb5b09))
* **corpus-view:** add 'e' key support for editing annotations ([c16202c](https://github.com/ecladatta/star-q/commit/c16202c609370e0149d7b190bc5dd3028acae621))
* **corpus-view:** add copy and edit options to annotation popover ([a44d8a6](https://github.com/ecladatta/star-q/commit/a44d8a65eb281ac449678edd20d7f657a11781d3))
* **corpus-view:** add swap button for subject and object in selector ([86777e9](https://github.com/ecladatta/star-q/commit/86777e9d151734d41fd0ac7a89eb04241bcd563d))
* **corpus-view:** add title and styling to document link title span ([f8bf7ee](https://github.com/ecladatta/star-q/commit/f8bf7eea49d4d1bce44fab7f03ec85de030ecf96))
* **corpus-view:** conditionally render metadata fields in corpus view ([06659be](https://github.com/ecladatta/star-q/commit/06659be76d6bd9bdc12274a7594842c90956bde9))
* **corpus-view:** handle keydown events for mention associations ([9c50ba8](https://github.com/ecladatta/star-q/commit/9c50ba83eb76666f91f14b3775f19ab2e7476e00))
* **corpus-view:** improve creating new annotation from existing one ([ea39c61](https://github.com/ecladatta/star-q/commit/ea39c61ff6eeb8c012e7dbb4caa50d808b1b53ba))
* **corpus-view:** update card title based on annotation state ([d8ddccb](https://github.com/ecladatta/star-q/commit/d8ddccb505a0027b913cab9140f4c510f05fdb0e))
* **corpus:** add corpus duplication with documents and annotations copy ([4bec840](https://github.com/ecladatta/star-q/commit/4bec84099b762c85d5e8a4b0b4862e017cda51d7))
* **corpus:** add corpus title heading to corpus page header ([735dcdd](https://github.com/ecladatta/star-q/commit/735dcdd5ce5a34d5d5b9e1372266f8035e877fcb))
* **corpus:** add export functionality for corpus data as JSON ([bedc7d3](https://github.com/ecladatta/star-q/commit/bedc7d3b2c36b6e8da6459abfc59f5d46399be10))
* **corpus:** add rename functionality with UI dialog and action ([83d839b](https://github.com/ecladatta/star-q/commit/83d839b6a1253a1a950f0ccea1d01d52bb5606b0))
* **corpus:** add scrollable area and improve table styling in CombinedElement ([a19065e](https://github.com/ecladatta/star-q/commit/a19065e435620da2e4fbe86599c71a3f15f316c8))
* **corpus:** add support for custom entities in annotations and UI ([e9efda8](https://github.com/ecladatta/star-q/commit/e9efda8fee63d548ed191581e5f114530dab920d))
* **corpus:** add total annotations count to corpus page display ([51cb44c](https://github.com/ecladatta/star-q/commit/51cb44c63827fee5918053203bfd62260282b9a7))
* **corpus:** highlight current annotation components in combined elements and marks ([69c2b9f](https://github.com/ecladatta/star-q/commit/69c2b9fccc253fbe97c3b3d6a1d319f9fac56542))
* **corpus:** improve table cell annotation interaction and styling ([67b7ee1](https://github.com/ecladatta/star-q/commit/67b7ee1114cdc438e2715e12ca81fb52571e73be))
* **corpus:** replace actions menu with reusable CorpusActions component and refactor corpus list actions ([828c458](https://github.com/ecladatta/star-q/commit/828c458274b7ba2e7c73dc80857d4a2114cb252c))
* delete annotation by pressing enter on confirmation popup ([de3bb96](https://github.com/ecladatta/star-q/commit/de3bb967573e83407c6998dd527aec1afc04ba62))
* display all annotations on corpus view ([c84ebf5](https://github.com/ecladatta/star-q/commit/c84ebf58e0825a44f499b4c1456c575e9ec6f31d))
* **docker:** add migrate service and Dockerfile for database migrations ([7806a19](https://github.com/ecladatta/star-q/commit/7806a194606a465a203670996c88bedb42f932c0))
* **docker:** add PostgreSQL service to development and production configs ([340791e](https://github.com/ecladatta/star-q/commit/340791ea40439e2793631e50d0d90a220db8949a))
* **document-sidebar:** auto-scroll to current document on load ([034c3ec](https://github.com/ecladatta/star-q/commit/034c3ec3ac1097a85d0dcd766c3ee58a38eccd93))
* **document-sidebar:** update item spacing and add hover styles ([97723d0](https://github.com/ecladatta/star-q/commit/97723d03c00267191380ddebbdc1ce91141836e6))
* **document-viewer:** add clone annotation shortcut and UI hints ([9817e46](https://github.com/ecladatta/star-q/commit/9817e460d52c3d11b7b8f40ac640a13f2b483c0d))
* **document-viewer:** add dropdown to copy text-only or whole document as markdown ([948aae6](https://github.com/ecladatta/star-q/commit/948aae647523af17b7577aeadccb0cd18e98a8df))
* **document:** add completion toggle and UI indicators for documents ([222e8f4](https://github.com/ecladatta/star-q/commit/222e8f4ee7df0bff440cf7cb9b832c262d93294a))
* **documents-table:** implement data table with pagination and sorting ([06d5abf](https://github.com/ecladatta/star-q/commit/06d5abfa8298ac7ea4adc9d8a34ce0ccbc4e0dd9))
* **documents:** improve documents table page layout ([ba12cb8](https://github.com/ecladatta/star-q/commit/ba12cb830f7e2864b6e4453ad1fa44520159784b))
* enable selecting the same mention twice ([fde089a](https://github.com/ecladatta/star-q/commit/fde089acd9c1029afeca06cf25a79c083d0d0ea5))
* **entity-selector:** add clear entity option to dropdown menu ([f387730](https://github.com/ecladatta/star-q/commit/f387730a54326fb4a32159961eac2d19a1c0c069))
* **entity-selector:** add description field and display it in list items ([ac5db4f](https://github.com/ecladatta/star-q/commit/ac5db4f83542c220c2109bf525c2cdf1ea0de5f5))
* **entity-selector:** start searching immediately when text changes ([93ec59d](https://github.com/ecladatta/star-q/commit/93ec59d678974ca2c2ed1d7c11327ce1d6e5004d))
* **env:** add environment example and update port configuration in YAML files ([20bff78](https://github.com/ecladatta/star-q/commit/20bff7865d57857339452b9c111550dcf4898bc8))
* **exports:** add truthy and full RDF 1.2 modes ([#7](https://github.com/ecladatta/star-q/issues/7)) ([02e3530](https://github.com/ecladatta/star-q/commit/02e3530a28a58ef12b389ba8ce1c9af82b3b2c43))
* **header:** display application version in header ([c584cb0](https://github.com/ecladatta/star-q/commit/c584cb021850f6a74a9ac675fc3418f976fc43ed))
* improve corpus and document views with datatables ([f9d4027](https://github.com/ecladatta/star-q/commit/f9d402798af590a0702b2e63fa90575f382a6205))
* increase max body size for proxy client ([3feb05b](https://github.com/ecladatta/star-q/commit/3feb05bc906e79f2e0118d8b3d8273be39d3b422))
* initial commit ([93587a4](https://github.com/ecladatta/star-q/commit/93587a46ab1ce15c5cb9733bb6cf0a48c3c6d0f1))
* keep track of user when adding annotation ([9c3a257](https://github.com/ecladatta/star-q/commit/9c3a257387b52603f5609c6563b9bd83554081ee))
* make authentication optional ([7e77201](https://github.com/ecladatta/star-q/commit/7e772012051779d22d2ae576f0c96f3d69ac62a4))
* **migrations:** add initial migration for document schema updates ([77c35cc](https://github.com/ecladatta/star-q/commit/77c35cccb53b9aedbd98fccd9be55a90dce39515))
* **next.config:** add server actions body size limit to 100mb ([ab0a704](https://github.com/ecladatta/star-q/commit/ab0a704b3295f3c908947817b0ec2f7e320a634b))
* prevent creating duplicate annotations ([8185889](https://github.com/ecladatta/star-q/commit/8185889d21e0087c9f35476d93d87adfbb5de6d8))
* refactor custom entity categorization to entity/relation ([b80d081](https://github.com/ecladatta/star-q/commit/b80d081bebe8121ee7aee2fee6ef531b691f23e8))
* refactor document annotation UI and state management components ([299354e](https://github.com/ecladatta/star-q/commit/299354e508809c00119141a5d2b39140ff2a380d))
* replace random IDs with UUIDs for annotation components ([68e3ba6](https://github.com/ecladatta/star-q/commit/68e3ba6fcbd71a07ecaf8c61923b669637eed821))
* revamp document sidebar UI and add search filter ([c002056](https://github.com/ecladatta/star-q/commit/c002056f7c94d0e7ddbf8890312127fc68b82308))
* save user accounts into database ([6acc6e1](https://github.com/ecladatta/star-q/commit/6acc6e1e8a881c736baea5b37c69324b18b35022))
* **selection-popover:** add delete annotation confirmation with tooltips ([92111d0](https://github.com/ecladatta/star-q/commit/92111d02ebf8e8bc392fac6cf1fd8736c3ea39b3))
* show all property stats without limit ([818c656](https://github.com/ecladatta/star-q/commit/818c656de66e0f06642b6278ad76e3107e124cc2))
* support all RDF-compatible XSD datatypes ([e343ef3](https://github.com/ecladatta/star-q/commit/e343ef3821026a9c6067d56131611d9a75ad452b))
* update corpus timestamp on document deletion ([84f679f](https://github.com/ecladatta/star-q/commit/84f679f385b3772bba5d7ea03b28119631c1609b))
* update document updatedAt on annotation operations ([e7b7191](https://github.com/ecladatta/star-q/commit/e7b7191e8fde93f683ca0e22f0d5325c2c2f8769))

### Bug Fixes

* add custom entities and fix dates in full export/import ([fdbea79](https://github.com/ecladatta/star-q/commit/fdbea7966d7a23ba2c6cbf899ad9f3672587d43b))
* add document ID validation in updateAnnotation ([e6b5171](https://github.com/ecladatta/star-q/commit/e6b51711f18b1692bb0c03b37fc6b4300331e3f9))
* add padding to the annotation form to prevent hiding text ([4648527](https://github.com/ecladatta/star-q/commit/4648527eacb21836d3c624201277cce7a637178d))
* **analytics-content:** add query params to document links by annotation type ([e268f79](https://github.com/ecladatta/star-q/commit/e268f79762f7de975baa12f6e89f9e1a92aa9276))
* **analytics:** check entityCustomId for unassigned predicates and entities ([e0f412f](https://github.com/ecladatta/star-q/commit/e0f412fe211eed94f6e2431497c6aa126f921b15))
* **analytics:** filter out unassigned predicates and entities in queries ([655c605](https://github.com/ecladatta/star-q/commit/655c6052950885613ad39cb5907f368c6c8234b6))
* **analytics:** include corpusCustomEntity data in corpus analytics queries ([9a2c84b](https://github.com/ecladatta/star-q/commit/9a2c84b2b830878c3cb0a83be7e71130eb824cf0))
* **annotations:** persist custom entity datatype changes on save ([07e6fc8](https://github.com/ecladatta/star-q/commit/07e6fc8f3c03c6b9c71c34c2d10f3dc9521e39b1))
* **annotations:** prevent qualifier summary overflow ([cb8d10a](https://github.com/ecladatta/star-q/commit/cb8d10a324700a7550277d159dc51b410ab084e6))
* **annotations:** support section heading selections ([a6cd6a9](https://github.com/ecladatta/star-q/commit/a6cd6a91dee013e434f3a3195c66360cd01aa88c))
* **api:** update params type in GET function to be a Promise ([a4004b2](https://github.com/ecladatta/star-q/commit/a4004b276d906c34cf65dbc67a9ff48d91c18f53))
* avoid corpus creation on failed import ([11a9484](https://github.com/ecladatta/star-q/commit/11a94847f466057cc3c457d3f2a290aa060dd20a))
* **corpus-view:** clear selection after associating a new mention ([b79c098](https://github.com/ecladatta/star-q/commit/b79c098832475224fd1265a1af876d15cbd5dd8b))
* **corpus-view:** fix scrolling of sidebars ([8688e75](https://github.com/ecladatta/star-q/commit/8688e7573ae008a16bbcdcadb734862e6ab42345))
* **corpus-view:** prevent default action on Escape key press ([7abfdf4](https://github.com/ecladatta/star-q/commit/7abfdf4073b84aa40f40b08715e21b50f38eeffe))
* **corpus-view:** trim selected text before creating annotation component ([0e8380a](https://github.com/ecladatta/star-q/commit/0e8380a3f79fc5a36224189a66fc3fd8a0eac6a5))
* **corpusActions:** use countDistinct for documents count ([d867b58](https://github.com/ecladatta/star-q/commit/d867b58c8af516e8d45f12aa06ed6516195fcd14))
* **corpus:** handle undefined title in rename action ([c50a0a5](https://github.com/ecladatta/star-q/commit/c50a0a56c379aeafc5ab55a0043b83b06589c776))
* **corpus:** improve delete confirmation and warning message ([aa3097b](https://github.com/ecladatta/star-q/commit/aa3097b8da13e68196c1999438eb7d5185a9fdef))
* **corpus:** update datatype and label when custom entity already exists ([f8a0f6a](https://github.com/ecladatta/star-q/commit/f8a0f6aeee9e1f25cac52daa47bba6e767c38409))
* detect single-line corpuswalker imports ([722bbf9](https://github.com/ecladatta/star-q/commit/722bbf90b8f410c222f925fffefd9140d9a37c9c))
* **document-sidebar:** show sidebar on large screens instead of medium ([271a94f](https://github.com/ecladatta/star-q/commit/271a94fbaa790c7cb76a2ecf02e62c81a74672d8))
* **documents-table:** suppress hydration warning on completedAt cell rendering ([3d0f899](https://github.com/ecladatta/star-q/commit/3d0f899cc510df10073d3592b0d14377f8f144bc))
* enable synthetic default imports in tsconfig to prevent error TS1192 when importing wtf_wikipedia ([e8973c7](https://github.com/ecladatta/star-q/commit/e8973c767c5dd73921fc413e45f1c94ef0263703))
* enforce API key check only on API routes and when auth is disabled ([b595293](https://github.com/ecladatta/star-q/commit/b595293c5dd54956aa74fc190cd3954852501fa7))
* ensure correct corpus is passed when importing documents ([0e4043a](https://github.com/ecladatta/star-q/commit/0e4043aa2ddd488687814fe174b1ffd5d38d7aab))
* **entity-selector:** prevent link from displaying for custom values ([ce4b210](https://github.com/ecladatta/star-q/commit/ce4b21068cc60bf29d1563ef217859c8d7ecb471))
* **eslint:** update ignore path for UI components in ESLint config ([71aba36](https://github.com/ecladatta/star-q/commit/71aba3676fc1b0643f0c52752839b6820532553c))
* force dynamic rendering of Corpuses page ([610ffc4](https://github.com/ecladatta/star-q/commit/610ffc485380fe21fb8b1967c5a17b62e32afeb7))
* guard split offsets against null text ([0a6ad2f](https://github.com/ecladatta/star-q/commit/0a6ad2f56880f3eaeb6a100f4dab4027cd6605a9))
* **import:** clear entity fields for custom entities during import ([d84e767](https://github.com/ecladatta/star-q/commit/d84e767ee19822833e6e42cde8ef8619987bf0bd))
* **import:** preserve document order by offsetting createdAt timestamps ([854ae2a](https://github.com/ecladatta/star-q/commit/854ae2a2ad91415befb9c9c52f8fa3e6d01a6ff1))
* **imports:** update TABLES_CSV filename to 'Annotation_tables.csv' ([abe9494](https://github.com/ecladatta/star-q/commit/abe9494512efaf4365b180cdaa57bf84a3d37fac))
* improve file input handling ([a6716dc](https://github.com/ecladatta/star-q/commit/a6716dc5e290f89a8102d0ddb4cf080646658181))
* improve header containers layout on mobile ([a53b065](https://github.com/ecladatta/star-q/commit/a53b06546d703f5601f9415c36f3f4bb28bebba4))
* improve layout and responsiveness of headers and buttons ([c58a950](https://github.com/ecladatta/star-q/commit/c58a9509af0936249dd66d2d32475f6a5c21b8ee))
* limit top entities to 50 and lazy-load documents ([5d9fa10](https://github.com/ecladatta/star-q/commit/5d9fa10b54e66fcd40d024cc00ab0c6be40672fd))
* **mark:** update click handling to allow text selection within span ([58d2f3d](https://github.com/ecladatta/star-q/commit/58d2f3d0c81b0ebdfccd59964252ccff34e42107))
* normalize corpuswalker document elements ([7d2ffbe](https://github.com/ecladatta/star-q/commit/7d2ffbebec7e00421d4cfe16bbd6f941163d0249))
* only render annotation value in annotation list ([94bbb85](https://github.com/ecladatta/star-q/commit/94bbb85417c7ee09ac6abca4ff3f1df079271ffc))
* optimize documents list fetching by using partial Document model ([abc679c](https://github.com/ecladatta/star-q/commit/abc679c09be549021d47ffd76a4e8895911d51bb))
* prevent re-rendering if url doesn't change ([f13677c](https://github.com/ecladatta/star-q/commit/f13677ce647898a263d4bebf312e578599d4b67f))
* properly close deletion popup after deleting from the annotation list popover ([512a085](https://github.com/ecladatta/star-q/commit/512a085348b5028e87546b1545d48d0d226ccd11))
* render new lines with whitespace pre-wrap ([3a8fe1f](https://github.com/ecladatta/star-q/commit/3a8fe1f3dc8073aabfbc0fbc6a9b1026a06ed7ae))
* restrict annotationType to 'text' or 'table' options ([1476546](https://github.com/ecladatta/star-q/commit/1476546c3eb20cd2261f1917ec7ee4f187ad0745))
* **selection-popover:** set PopoverContent side to top for better UI alignment ([a521b7e](https://github.com/ecladatta/star-q/commit/a521b7e8a6a1cbf4d5335ed1d08b0380d9c7e377))
* show import validation errors in upload UI ([72152bf](https://github.com/ecladatta/star-q/commit/72152bf4447f66ff5fcd75f582ec3be6cecdcc52))
* sort documents by creation date ([1d18dab](https://github.com/ecladatta/star-q/commit/1d18dab46b62616a6fc513446156906f1f38b0bb))
* support object extraction metadata ([768165d](https://github.com/ecladatta/star-q/commit/768165d261c80366243448f49a6103af9ece677d))
* update annotation type check rule for text/table/joint ([b46bd2a](https://github.com/ecladatta/star-q/commit/b46bd2a7b074a16a90722acefd86336b2e685417))
* update annotationTag when swapping subject and object ([ce5415e](https://github.com/ecladatta/star-q/commit/ce5415eca864506546f22dd68ddf501245c98215))
* update popover state when deleting annotation ([7f86d28](https://github.com/ecladatta/star-q/commit/7f86d28c11b2ac99e79c5daf01b42effd08c74d9))
* use correct button variant for sign-in button ([361c197](https://github.com/ecladatta/star-q/commit/361c1971af9318ad61b2ca5e961a34956186e446))
* wrap TooltipTrigger in span with asChild to prevent hydration issues ([ae447f1](https://github.com/ecladatta/star-q/commit/ae447f108025b9e43dfa286b32142dbee7d3944b))

### Performance Improvements

* **corpus:** batch inserts for documents, components, and annotations ([54983b9](https://github.com/ecladatta/star-q/commit/54983b9368b3e41f3e2749f3dd836ebd3a88781e))
* optimize annotation deletion by using bulk delete instead of loop ([fdf75fc](https://github.com/ecladatta/star-q/commit/fdf75fcfa0a964d446999f7d106d367b5a7581fa))
