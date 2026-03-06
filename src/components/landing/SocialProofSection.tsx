const companyPlaceholders = [
  "Company Logo 1",
  "Company Logo 2",
  "Company Logo 3",
  "Company Logo 4",
  "Company Logo 5",
];

const SocialProofSection = () => {
  return (
    <section className="py-14 lg:py-16 gradient-section">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl sm:text-3xl font-semibold text-foreground">
            Trusted by modern hiring teams
          </h2>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
            Early partners and pilot customers.
          </p>
        </div>

        <div className="flex items-center gap-4 lg:gap-6 overflow-x-auto pb-2">
          {companyPlaceholders.map((label) => (
            <div
              key={label}
              className="min-w-[150px] sm:min-w-[180px] h-14 sm:h-16 rounded-xl border border-border/50 bg-card/60 text-muted-foreground/70 text-xs sm:text-sm font-medium flex items-center justify-center grayscale"
            >
              {label}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default SocialProofSection;
