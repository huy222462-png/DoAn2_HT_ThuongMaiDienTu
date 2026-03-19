/*
 * Migrate local disk image paths in ProductImages table to /uploads/images/*
 *
 * Run:
 *   node scripts/migrate-local-image-paths.js
 */

const { connectDB, closeDB, getPool, sql } = require('../config/database');
const { copyLocalImageToUploads } = require('../utils/imageUtils');

const LOCAL_PATH_PATTERN = /^(file:\/\/|[a-zA-Z]:\\|\\\\)/;

const run = async () => {
  let migrated = 0;
  let skipped = 0;
  let failed = 0;

  try {
    await connectDB();
    const pool = getPool();

    const result = await pool.request().query(`
      SELECT ProductID, ImageURL
      FROM ProductImages
      WHERE ImageURL IS NOT NULL
        AND LTRIM(RTRIM(ImageURL)) <> ''
    `);

    const rows = result.recordset || [];
    console.log(`[INFO] Found ${rows.length} image records to inspect`);

    for (const row of rows) {
      const productId = row.ProductID;
      const imageUrl = String(row.ImageURL || '').trim();

      if (!LOCAL_PATH_PATTERN.test(imageUrl)) {
        skipped += 1;
        continue;
      }

      try {
        const newPublicPath = copyLocalImageToUploads(imageUrl);

        await pool.request()
          .input('productId', sql.Int, productId)
          .input('oldImageUrl', sql.NVarChar, imageUrl)
          .input('newImageUrl', sql.NVarChar, newPublicPath)
          .query(`
            UPDATE ProductImages
            SET ImageURL = @newImageUrl
            WHERE ProductID = @productId AND ImageURL = @oldImageUrl
          `);

        migrated += 1;
        console.log(`[MIGRATED] ProductID=${productId}: ${imageUrl} -> ${newPublicPath}`);
      } catch (error) {
        failed += 1;
        console.error(`[FAILED] ProductID=${productId}: ${imageUrl}`);
        console.error(`         Reason: ${error.message}`);
      }
    }

    console.log('\n[SUMMARY]');
    console.log(`- migrated: ${migrated}`);
    console.log(`- skipped : ${skipped}`);
    console.log(`- failed  : ${failed}`);

    process.exitCode = failed > 0 ? 1 : 0;
  } catch (error) {
    console.error('[ERROR] Migration failed:', error.message);
    process.exitCode = 1;
  } finally {
    await closeDB();
  }
};

run();
