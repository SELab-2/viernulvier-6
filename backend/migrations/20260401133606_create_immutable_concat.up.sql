-- https://stackoverflow.com/questions/54372666/create-an-immutable-clone-of-concat-ws
CREATE OR REPLACE FUNCTION immutable_concat_ws(text, VARIADIC text[])
RETURNS text
LANGUAGE internal IMMUTABLE PARALLEL SAFE AS
'text_concat_ws';
