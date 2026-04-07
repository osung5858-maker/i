-- reviews 테이블에 장소명 컬럼 추가
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS place_name TEXT;
