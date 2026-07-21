package portal.ti.queiroz.model;

import jakarta.persistence.*;
import lombok.Data;
import java.util.List;

@Data
@Entity
@Table(name = "links_uteis")
public class LinkUtil {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String url;

    @Column(nullable = false)
    private String category;

    @ElementCollection
    @CollectionTable(name = "link_tags", joinColumns = @JoinColumn(name = "link_id"))
    @Column(name = "tag")
    private List<String> tags;
}