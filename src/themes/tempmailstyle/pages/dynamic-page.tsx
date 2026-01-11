import { getThemeBlock } from '@/core/theme';
import type { DynamicPage as DynamicPageType } from '@/shared/types/blocks/landing';
import {
    Hero,
    TempMail,
} from '@/themes/tempmailstyle/blocks';

export default async function DynamicPage({
    locale,
    page,
    data,
}: {
    locale?: string;
    page: DynamicPageType;
    data?: Record<string, any>;
}) {
    const sections = [];
    if (page?.sections) {
        for (const sectionKey of Object.keys(page.sections)) {
            const section = page.sections[sectionKey];
            if (!section) continue;

            const block = section.block || section.id || sectionKey;

            switch (block) {
                case 'hero':
                    sections.push(<Hero key={sectionKey} section={section} />);
                    break;
                case 'temp-mail':
                    sections.push(<TempMail key={sectionKey} />);
                    break;
                default:
                    try {
                        if (section.component) {
                            sections.push(section.component);
                            break;
                        }

                        const DynamicBlock = await getThemeBlock(block);
                        sections.push(
                            <DynamicBlock
                                key={sectionKey}
                                section={section}
                                {...(data || section.data || {})}
                            />
                        );
                    } catch (error) {
                        console.log(`Dynamic block "${block}" not found`);
                    }
                    break;
            }
        }
    }

    return (
        <>
            {page.title && !page.sections?.hero && (
                <h1 className="sr-only">{page.title}</h1>
            )}
            {sections}
        </>
    );
}
