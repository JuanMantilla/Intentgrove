# F003F data model

Root grant (native ID, identity, generation) owns a Search job (query/mode, include-ignored, cancellation token, scanned/skipped counts, status). A Result holds root-relative validated segments, file identity/version, line/byte range and bounded context; it is not an access grant. Batches carry job/root generation. Only completed scans report final totals. Search stores no persistent content index in v1.
