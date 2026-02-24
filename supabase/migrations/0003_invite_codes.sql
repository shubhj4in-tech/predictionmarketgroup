-- Add short join code to group_invites
alter table group_invites add column if not exists code text unique;
create index if not exists group_invites_code_idx on group_invites(code);
