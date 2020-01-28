-- Retrieves all branch junctions (headers referenced by the parent field of at least two other headers)
-- in ascending order by block number

select '0x' || p.block_hash as branch_junction
	from blockheader p join blockheader s on ('0x' || p.block_hash) = (s.block_data ->> 'parentHash')
	where p.block_number between 9121452 and 9218882
	group by p.block_hash
	having count(*) > 1
	order by p.block_number