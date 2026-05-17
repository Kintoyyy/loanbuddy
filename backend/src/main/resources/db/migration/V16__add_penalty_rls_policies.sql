ALTER TABLE public.loan_penalties ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage penalties for their own loans" ON public.loan_penalties;
CREATE POLICY "Users can manage penalties for their own loans"
    ON public.loan_penalties
    FOR ALL
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.loans
        WHERE loans.loan_id = loan_penalties.loan_id
          AND loans.lender_id = auth.uid()
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.loans
        WHERE loans.loan_id = loan_penalties.loan_id
          AND loans.lender_id = auth.uid()
    ));

DROP POLICY IF EXISTS "Anon users cannot access loan penalties" ON public.loan_penalties;
CREATE POLICY "Anon users cannot access loan penalties"
    ON public.loan_penalties
    FOR ALL
    TO anon
    USING (false)
    WITH CHECK (false);

ALTER TABLE public.entry_penalties ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage penalties for their own entries" ON public.entry_penalties;
CREATE POLICY "Users can manage penalties for their own entries"
    ON public.entry_penalties
    FOR ALL
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.entries
        WHERE entries.entry_id = entry_penalties.entry_id
          AND entries.user_id = auth.uid()
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.entries
        WHERE entries.entry_id = entry_penalties.entry_id
          AND entries.user_id = auth.uid()
    ));

DROP POLICY IF EXISTS "Anon users cannot access entry penalties" ON public.entry_penalties;
CREATE POLICY "Anon users cannot access entry penalties"
    ON public.entry_penalties
    FOR ALL
    TO anon
    USING (false)
    WITH CHECK (false);

NOTIFY pgrst, 'reload schema';
